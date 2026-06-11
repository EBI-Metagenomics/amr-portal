import csv
import io
import json
import math
from collections import defaultdict
from dataclasses import dataclass
from itertools import chain
from typing import Any, Dict, Iterable, Iterator, List, Optional, Tuple

import duckdb
import numpy as np
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
import logging

from models.payload import Payload
from core.config import get_settings
from core.duckdb_conn import connect_duckdb
from core.filters_config_parser import build_filters_config
from services.global_search import (
    compose_search_query,
    fetch_search_counts_by_dataset,
    merge_search_predicate,
    require_filters_or_search,
    resolve_search_prefix,
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
_settings = get_settings()

# Cache display columns per view_id so repeated downloads do not incur extra metadata queries.
_display_columns_cache: Dict[int, Any] = {}
_table_columns_cache: Dict[str, frozenset[str]] = {}
_view_dataset_map: Optional[Dict[int, str]] = None


@dataclass
class FilterQueryContext:
    """Container for all SQL/query metadata needed to stream AMR records."""
    dataset: str
    base_query: str
    count_query: str
    base_params: List[Any]
    count_params: List[Any]
    display_column_details: dict
    order_by_col: Optional[str]


def get_table_columns(table_name: str, db: duckdb.DuckDBPyConnection) -> set[str]:
    """Return the set of column names for the provided table (cached per process)."""
    cached = _table_columns_cache.get(table_name)
    if cached is not None:
        return set(cached)
    try:
        columns_result = db.query(f"PRAGMA table_info({table_name})").fetchdf()
        columns = frozenset(columns_result["name"].tolist())
        _table_columns_cache[table_name] = columns
        return set(columns)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Failed to get columns for table: {table_name}")


def get_view_dataset_map(db: duckdb.DuckDBPyConnection) -> Dict[int, str]:
    """Map view_id → dataset table name (loaded once per process)."""
    global _view_dataset_map
    if _view_dataset_map is not None:
        return _view_dataset_map
    try:
        rows = db.execute(
            "SELECT DISTINCT view_id, dataset_name FROM view_categories"
        ).fetchall()
        _view_dataset_map = {int(view_id): str(dataset_name) for view_id, dataset_name in rows}
        return _view_dataset_map
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load view dataset map: {e}")

def check_selected_filters(grouped_filters, valid_columns):
    """Verify that all requested filter columns exist within the dataset schema.

    Args:
        grouped_filters (dict): Mapping of column name to selected values.
        valid_columns (set[str]): Columns available on the dataset.

    Returns:
        bool: True when every requested column exists, False otherwise.
    """
    if set(grouped_filters).issubset(valid_columns):
        return True
    return False

def get_dataset_from_view(view_id: int, db: duckdb.DuckDBPyConnection) -> str:
    """Resolve the dataset backing a view_id."""
    dataset = get_view_dataset_map(db).get(int(view_id))
    if dataset is None:
        raise HTTPException(status_code=400, detail=f"Failed to get dataset from view ID: {view_id}")
    return dataset

def get_display_column_details(view_id: int, db: duckdb.DuckDBPyConnection):
    """Return per-column metadata for a view, caching results for reuse.

    Args:
        view_id (int): Requested view identifier.
        db (duckdb.DuckDBPyConnection): Database connection.

    Returns:
        pandas.DataFrame: Column metadata including fullname, name, type, etc.

    Raises:
        HTTPException: If the metadata query fails.
    """

    if view_id in _display_columns_cache:
        return _display_columns_cache[view_id].copy()

    columns_to_display_query = """
        SELECT cd.fullname, cd.name, cd.label, cd.type, cd.sortable, cd.url, cd.delimiter
        FROM view as v
            JOIN view_column vc on v.view_id = vc.view_id
            JOIN column_definition cd on vc.column_id = cd.column_id
        WHERE v.view_id = ?
        ORDER BY vc.rank;
    """
    try:
        columns = db.execute(columns_to_display_query, [view_id]).fetchdf()
        _display_columns_cache[view_id] = columns
        return columns.copy()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get columns to display from view ID: {view_id}")

def quote_column_name(column_name):
    """Quote a column name for DuckDB SQL usage.

    Args:
        column_name (str): Unquoted identifier.

    Returns:
        str: Identifier quoted with double quotes.
    """
    return f'"{column_name}"'

def fetch_filters(db):
    """Load the filters configuration used by the UI.

    Args:
        db (duckdb.DuckDBPyConnection): Database connection.

    Returns:
        dict: Parsed filters configuration.
    """
    return build_filters_config(db)


def _normalize_value(value):
    """Normalize scalar values so NaN/inf do not leak into serialized output.

    Args:
        value: Arbitrary scalar fetched from DuckDB.

    Returns:
        Any: Value safe to serialize.
    """
    if value is None:
        return None
    if isinstance(value, (float, np.floating)):
        if math.isnan(value) or math.isinf(value):
            return None
    return value


def _append_order_clause(query: str, payload: Payload, order_by_col: Optional[str]) -> str:
    """Add an ORDER BY clause if the payload specifies a sortable column.

    Args:
        query (str): Base SQL query.
        payload (Payload): Request payload that may include order_by.
        order_by_col (Optional[str]): Sanitized column name or None.

    Returns:
        str: Query with ORDER BY appended when required.
    """
    if payload.order_by and order_by_col:
        return f"{query} ORDER BY {quote_column_name(order_by_col)} {payload.order_by.order}"
    return query


def _build_filter_query_context(payload: Payload, db: duckdb.DuckDBPyConnection) -> FilterQueryContext:
    """Pre-compute shared SQL fragments/metadata for both paged and streaming exports.

    Args:
        payload (Payload): Request payload containing selected filters and sorting.
        db (duckdb.DuckDBPyConnection): Database connection.

    Returns:
        FilterQueryContext: Object encapsulating dataset info and reusable SQL snippets.

    Raises:
        HTTPException: If the view_id is missing, filters are invalid, or order_by references an unknown column.
    """
    selected_view_id = payload.view_id
    # Check if the view_id is specified
    if not selected_view_id:
        raise HTTPException(
            status_code=400,
            detail="Please specify a view ID to filter by."
        )

    # Now we use the selected view to infer which dataset to query data from
    selected_dataset = get_dataset_from_view(selected_view_id, db)

    valid_columns = get_table_columns(selected_dataset, db)
    # not all valid columns are eventually displayed
    # We need to keep only the ones we are interested
    columns_to_display = get_display_column_details(selected_view_id, db)

    # This will be used below in the SQL query to select only columns we are interested in
    # Properly quote column names for SQL query
    quoted_columns = [quote_column_name(col) for col in columns_to_display["name"]]
    columns_to_display_str = ", ".join(quoted_columns)
    
    # Build dict of column details for serializer
    columns_to_display_dict = columns_to_display.to_dict('records')
    display_column_details = {r["fullname"]: r for r in columns_to_display_dict}

    # group them together and trim the first dataset name part
    grouped_filters_with_operator = _group_selected_filters_with_operator(
        payload.selected_filters,
        payload.facet_operators if hasattr(payload, "facet_operators") else {},
    )
    grouped_filters = {
        category: details["values"]
        for category, details in grouped_filters_with_operator.items()
    }

    are_filters_valid = check_selected_filters(grouped_filters, valid_columns)
    logger.info(f"are_filters_valid: {are_filters_valid}")
    logger.info(f"selected_view_id: {selected_view_id}")
    logger.info(f"selected_dataset: {selected_dataset}")
    logger.info(f"grouped_filters: {grouped_filters}")
    logger.info(f"quoted_columns: {quoted_columns}")

    if not are_filters_valid:
        raise HTTPException(
            status_code=400,
            detail="Something is wrong with the filters, double check the category values."
        )

    order_by_col = None
    if payload.order_by:
        order_by_col = payload.order_by.category.split("-")[-1]
        if order_by_col not in valid_columns:
            raise HTTPException(status_code=400, detail=f"Invalid order_by column: {order_by_col!r}")

    where_sql, where_params = _build_where_clause(grouped_filters_with_operator)
    search_prefix = resolve_search_prefix(
        getattr(payload, "search_query", None),
        db,
    )
    require_filters_or_search(payload.selected_filters, search_prefix)
    where_sql = merge_search_predicate(where_sql, search_prefix)

    base_query = f"SELECT {columns_to_display_str} FROM {selected_dataset}"
    count_query = f"SELECT COUNT(*) AS count FROM {selected_dataset}"
    if where_sql:
        base_query += f" WHERE {where_sql}"
        count_query += f" WHERE {where_sql}"

    base_query, base_params = compose_search_query(
        base_query,
        list(where_params),
        selected_dataset,
        search_prefix,
    )
    count_query, count_params = compose_search_query(
        count_query,
        list(where_params),
        selected_dataset,
        search_prefix,
    )

    return FilterQueryContext(
        dataset=selected_dataset,
        base_query=base_query,
        count_query=count_query,
        base_params=base_params,
        count_params=count_params,
        display_column_details=display_column_details,
        order_by_col=order_by_col,
    )


def _group_selected_filters_with_operator(
    selected_filters: List[Any],
    facet_operators: Optional[Dict[str, str]] = None,
    excluded_category: Optional[str] = None,
) -> Dict[str, Dict[str, Any]]:
    grouped_filters: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"values": [], "operator": "OR"})
    for selected in selected_filters:
        if excluded_category and selected.category == excluded_category:
            continue
        trimmed_filter_category = selected.category.split("-")[-1]
        operator = (facet_operators or {}).get(selected.category, "OR").upper()
        grouped_filters[trimmed_filter_category]["values"].append(selected.value)
        grouped_filters[trimmed_filter_category]["operator"] = "AND" if operator == "AND" else "OR"
    return grouped_filters


def _build_where_clause(grouped_filters: Dict[str, Dict[str, Any]]) -> Tuple[str, List[Any]]:
    where_clauses = []
    params: List[Any] = []
    for category, details in grouped_filters.items():
        values = details["values"]
        operator = details.get("operator", "OR")
        if operator == "AND":
            and_clause = " AND ".join([f'{quote_column_name(category)} = ?' for _ in values])
            params.extend(values)
            where_clauses.append(f"({and_clause})")
        else:
            tuple_clause = f"({', '.join(['?'] * len(values))})"
            params.extend(values)
            where_clauses.append(f'{quote_column_name(category)} IN {tuple_clause}')
    return " AND ".join(where_clauses), params


def _fetch_view_facet_definitions(view_id: int, db: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    query = """
        SELECT
            vc.column_fullname AS id,
            vc.category_name AS label,
            vc.category_group_is_primary AS is_primary,
            vc.category_group_id AS group_id
        FROM view_categories vc
        WHERE vc.view_id = ?
        ORDER BY vc.category_group_is_primary DESC, vc.category_group_id, vc.column_fullname
    """
    rows = db.execute(query, [view_id]).fetchall()
    facets: List[Dict[str, Any]] = []
    seen = set()
    for row in rows:
        facet_id = row[0]
        if facet_id in seen:
            continue
        seen.add(facet_id)
        facets.append({"id": facet_id, "label": row[1]})
    return facets


def _fetch_facet_option_labels(
    facet_ids: List[str],
    db: duckdb.DuckDBPyConnection,
) -> Dict[str, Dict[str, str]]:
    if not facet_ids:
        return {}
    placeholders = ", ".join(["?"] * len(facet_ids))
    query = f"""
        SELECT cd.fullname AS facet_id, f.value, f.label
        FROM filter f
        JOIN column_definition cd ON f.column_id = cd.column_id
        WHERE cd.fullname IN ({placeholders})
    """
    rows = db.execute(query, facet_ids).fetchall()
    result: Dict[str, Dict[str, str]] = defaultdict(dict)
    for facet_id, value, label in rows:
        result[facet_id][str(value)] = str(label)
    return result


def _fetch_data_type_summary(
    selected_filters: List[Any],
    current_view_id: int,
    db: duckdb.DuckDBPyConnection,
    search_prefix: Optional[str] = None,
) -> List[Dict[str, Any]]:
    query = "SELECT view_id, name FROM view ORDER BY view_id"
    rows = db.execute(query).fetchall()
    view_dataset_map = get_view_dataset_map(db)
    selected_by_dataset: Dict[str, int] = defaultdict(int)
    for selected in selected_filters:
        dataset_name = selected.category.split("-")[0]
        selected_by_dataset[dataset_name] += 1
    search_counts = (
        fetch_search_counts_by_dataset(db, search_prefix)
        if search_prefix
        else {}
    )
    summaries = []
    for view_id, name in rows:
        dataset_name = view_dataset_map.get(int(view_id))
        if dataset_name is None:
            continue
        summary: Dict[str, Any] = {
            "id": int(view_id),
            "name": str(name),
            "selected_count": int(selected_by_dataset.get(str(dataset_name), 0)),
            "active": int(view_id) == int(current_view_id),
        }
        if search_prefix:
            summary["search_count"] = int(search_counts.get(str(dataset_name), 0))
        summaries.append(summary)
    return summaries


def fetch_amr_facets(payload: Any, db: duckdb.DuckDBPyConnection):
    selected_view_id = payload.view_id
    selected_dataset = get_dataset_from_view(selected_view_id, db)
    valid_columns = get_table_columns(selected_dataset, db)
    facet_definitions = _fetch_view_facet_definitions(selected_view_id, db)
    facet_option_labels = _fetch_facet_option_labels([facet["id"] for facet in facet_definitions], db)
    search_prefix = resolve_search_prefix(
        getattr(payload, "search_query", None),
        db,
    )
    # Facets must load with no filters so the sidebar can show options before browse/search.
    data_type_summary = _fetch_data_type_summary(
        payload.selected_filters,
        selected_view_id,
        db,
        search_prefix,
    )

    facets = []
    for facet in facet_definitions:
        facet_id = facet["id"]
        trimmed_category = facet_id.split("-")[-1]
        if trimmed_category not in valid_columns:
            continue

        facet_operator = (
            payload.facet_operators.get(facet_id, "OR").upper()
            if hasattr(payload, "facet_operators")
            else "OR"
        )
        excluded_category = None if facet_operator == "AND" else facet_id
        grouped_filters = _group_selected_filters_with_operator(
            payload.selected_filters,
            payload.facet_operators if hasattr(payload, "facet_operators") else {},
            excluded_category=excluded_category,
        )
        where_sql, where_params = _build_where_clause(grouped_filters)
        where_sql = merge_search_predicate(where_sql, search_prefix)
        paging = payload.facet_paging.get(facet_id) if payload.facet_paging else None
        limit = max(1, min(200, (paging.limit if paging else 10)))
        offset = max(0, paging.offset if paging else 0)
        search = (paging.search.strip() if paging and paging.search else "")
        facet_params: List[Any] = list(where_params)

        facet_value_expr = quote_column_name(trimmed_category)
        base_count_query = f"""
            SELECT {facet_value_expr} AS value, COUNT(*) AS count
            FROM {selected_dataset}
        """
        total_options_query = f"""
            SELECT COUNT(DISTINCT {facet_value_expr})
            FROM {selected_dataset}
        """
        if where_sql:
            base_count_query += f" WHERE {where_sql}"
            total_options_query += f" WHERE {where_sql}"
            value_prefix = " AND "
        else:
            value_prefix = " WHERE "

        base_count_query += f"{value_prefix}{facet_value_expr} IS NOT NULL"
        total_options_query += f"{value_prefix}{facet_value_expr} IS NOT NULL"
        if search:
            base_count_query += (
                f" AND LOWER(CAST({facet_value_expr} AS VARCHAR)) "
                "LIKE ?"
            )
            total_options_query += (
                f" AND LOWER(CAST({facet_value_expr} AS VARCHAR)) "
                "LIKE ?"
            )
            facet_params.append(f"%{search.lower()}%")

        grouped_query = (
            f"{base_count_query} "
            f"GROUP BY {facet_value_expr} "
            "ORDER BY LOWER(CAST(value AS VARCHAR)) ASC"
        )
        paged_query = (
            "SELECT value, count, COUNT(*) OVER() AS total_options "
            f"FROM ({grouped_query}) facet_counts "
            "LIMIT ? OFFSET ?"
        )
        paged_params = [*facet_params, limit, offset]
        paged_query, paged_params = compose_search_query(
            paged_query,
            paged_params,
            selected_dataset,
            search_prefix,
        )
        rows_with_total = db.execute(paged_query, paged_params).fetchall()
        total_options = int(rows_with_total[0][2]) if rows_with_total else 0
        rows = [(value, count) for value, count, _ in rows_with_total]

        selected_values = {
            selected.value
            for selected in payload.selected_filters
            if selected.category == facet_id
        }
        options = []
        labels_for_facet = facet_option_labels.get(facet_id, {})
        for value, count in rows:
            normalized_value = str(value)
            options.append(
                {
                    "value": normalized_value,
                    "label": labels_for_facet.get(normalized_value, normalized_value),
                    "count": int(count),
                    "selected": normalized_value in selected_values,
                }
            )

        has_more = len(options) < total_options
        facets.append(
            {
                "id": facet_id,
                "label": facet["label"],
                "selected_count": len(selected_values),
                "total_options": total_options,
                "options": options,
                "has_more": has_more,
                "next_offset": len(options) if has_more else None,
            }
        )

    return {"data_type": data_type_summary, "facets": facets}


def _stream_prefixed_rows(
    context: FilterQueryContext,
    payload: Payload,
    query_params: List[Any],
    _db: duckdb.DuckDBPyConnection,
    batch_size: int = 10_000,
) -> Iterator[Dict[str, Any]]:
    """Yield dataset-prefixed rows directly from DuckDB in bounded batches.

    Args:
        context (FilterQueryContext): Shared SQL/metadata.
        payload (Payload): Download request payload.
        batch_size (int): Number of rows to fetch per chunk from DuckDB.

    Yields:
        Dict[str, Any]: Sanitized row mapping, prefixed with dataset name to match UI expectations.
    """
    query = _append_order_clause(context.base_query, payload, context.order_by_col)
    # Dedicated connection: the request lock is released before StreamingResponse finishes.
    stream_conn = connect_duckdb(_settings.duckdb_path, read_only=True)
    try:
        cursor = stream_conn.execute(query, query_params)
        raw_columns = [desc[0] for desc in cursor.description]
        prefixed_columns = [f"{context.dataset}-{col}" for col in raw_columns]

        while True:
            chunk = cursor.fetchmany(batch_size)
            if not chunk:
                break
            for row in chunk:
                yield {
                    col_name: _normalize_value(value)
                    for col_name, value in zip(prefixed_columns, row)
                }
    finally:
        stream_conn.close()


def _build_columns_metadata(display_column_details: dict) -> list[Dict[str, Any]]:
    """Build response-level column metadata from DB display column details."""
    columns_meta: list[Dict[str, Any]] = []
    for column_id, details in display_column_details.items():
        column_type = details.get("type") or "string"

        column_meta: Dict[str, Any] = {
            "id": column_id,
            "label": details.get("label") or details.get("name") or column_id,
            "type": column_type,
            "sortable": bool(details.get("sortable")),
        }
        if column_type in {"link", "array-link"} and details.get("url"):
            column_meta["url_template"] = details["url"]
        columns_meta.append(column_meta)
    return columns_meta


def _serialize_record_row(
    row: Dict[str, Any],
    columns_meta: list[Dict[str, Any]],
    display_column_details: dict,
) -> Dict[str, Any]:
    """Serialize one DB row into {column_id: value} based on column type metadata."""
    result: Dict[str, Any] = {}

    for column in columns_meta:
        column_id = column["id"]
        value = _normalize_value(row.get(column_id))
        column_type = column["type"]

        if value is None:
            result[column_id] = None
            continue

        if column_type == "array-link":
            delimiter = display_column_details[column_id].get("delimiter")
            if delimiter and isinstance(value, str):
                result[column_id] = [entry for entry in value.split(delimiter) if entry]
            else:
                result[column_id] = []
            continue

        result[column_id] = value

    return result


def filter_amr_records(payload: Payload, db: duckdb.DuckDBPyConnection):
    """Fetch a single page of AMR results for UI consumption.

    Args:
        payload (Payload): Request payload with pagination/filtering details.
        db (duckdb.DuckDBPyConnection): Database connection.

    Returns:
        dict: Paginated response matching the existing API contract.

    Raises:
        HTTPException: If DuckDB fails or invalid filters/order_by are provided.
    """
    context = _build_filter_query_context(payload, db)
    page = payload.page or 1
    per_page = payload.per_page or 100

    try:
        logger.info(f"selected_filters: {payload.selected_filters}")
        logger.info(f"count_query: {context.count_query}")

        total_hits = db.execute(context.count_query, context.count_params).fetchone()[0]

        offset = (page - 1) * per_page
        paginated_query = _append_order_clause(context.base_query, payload, context.order_by_col)
        paginated_query += " LIMIT ? OFFSET ?"
        paginated_params = [*context.base_params, per_page, offset]
        logger.info(f"base_query: {paginated_query}")

        res_df = db.execute(paginated_query, paginated_params).fetchdf()
        res_df = res_df.replace({np.nan: None, np.inf: None, -np.inf: None})
        res_df = res_df.add_prefix(f"{context.dataset}-")
        columns_meta = _build_columns_metadata(context.display_column_details)
        result = [
            _serialize_record_row(row.to_dict(), columns_meta, context.display_column_details)
            for _, row in res_df.iterrows()
        ]

        return {
            "meta": {
                "total_hits": total_hits,
                "page": page,
                "per_page": per_page,
                "columns": columns_meta,
            },
            "data": result
        }

    except Exception as e:
        logger.error(f"Database query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database query failed, see the logs for more details")

def flatten_record(record):
    """Convert records into a flat object for download serializers.

    Args:
        record (dict[str, Any]): Serialized AMR record.

    Returns:
        dict: Flattened mapping used by CSV/JSON streaming helpers.
    """
    return record


def stream_csv(rows: Iterable[Dict[str, Any]]):
    """Generate CSV chunks progressively to avoid loading everything in memory.

    Args:
        rows (Iterable[Dict[str, Any]]): Iterator of flattened records.

    Yields:
        bytes: UTF-8 encoded CSV chunks with headers emitted once.
    """
    iterator = iter(rows)
    try:
        first_row = next(iterator)
    except StopIteration:
        yield "id\n".encode("utf-8")
        return

    buffer = io.StringIO()
    headers = list(first_row.keys())
    writer = csv.DictWriter(buffer, fieldnames=headers)
    writer.writeheader()

    for i, row in enumerate(chain([first_row], iterator), start=1):
        writer.writerow(row)
        # Sends data when buffer reaches ~64KB or every 500 rows
        if buffer.tell() > 64 * 1024 or i % 500 == 0:
            chunk = buffer.getvalue()     # Get current buffer content
            buffer.seek(0)                # Move to start
            buffer.truncate(0)            # Clear buffer
            yield chunk.encode("utf-8")   # Send chunk as bytes

    # Send any remaining data
    remaining = buffer.getvalue()
    if remaining:
        yield remaining.encode("utf-8")


def stream_json_rows(rows: Iterable[Dict[str, Any]]):
    """Stream JSON array chunks without loading everything into memory.

    Args:
        rows (Iterable[Dict[str, Any]]): Iterator of flattened records.

    Yields:
        bytes: UTF-8 encoded JSON fragments representing an array.
    """
    iterator = iter(rows)
    yield b"["
    first = True
    for row in iterator:
        chunk = json.dumps(row, ensure_ascii=False)
        if first:
            first = False
        else:
            yield b","
        yield chunk.encode("utf-8")
    yield b"]"


def fetch_filtered_records(payload: Payload, scope, file_format, db: duckdb.DuckDBPyConnection):
    """Download filtered AMR records in CSV or JSON format.

    Args:
        payload (Payload): Request payload matching the POST body schema.
        scope (str): Either "page" or "all" to control pagination versus full export.
        file_format (str): Either "csv" or "json".
        db (duckdb.DuckDBPyConnection): Database connection.

    Returns:
        StreamingResponse: Response that streams either CSV or JSON data.

    Raises:
        HTTPException: If scope/file_format are invalid or no rows match the filters.
    """
    scope = (scope or "all").lower()
    if scope not in {"page", "all"}:
        raise HTTPException(status_code=400, detail="scope must be 'page' or 'all'")

    if scope == "page":
        data = filter_amr_records(payload, db)["data"]
        if not data:
            raise HTTPException(status_code=404, detail="No data found for the given filters")

        flat_results = [flatten_record(r) for r in data]
        if file_format == "json":
            content = json.dumps(flat_results, ensure_ascii=False, indent=2)
            file_like = io.BytesIO(content.encode("utf-8"))
            return StreamingResponse(
                file_like,
                media_type="application/json",
                headers={"Content-Disposition": "attachment; filename=amr_records.json"}
            )

        return StreamingResponse(
            stream_csv(flat_results),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=amr_records.csv"}
        )

    # scope == "all" - true streaming without loading the full dataset
    context = _build_filter_query_context(payload, db)
    total_hits = db.execute(context.count_query, context.count_params).fetchone()[0]
    if total_hits == 0:
        raise HTTPException(status_code=404, detail="No data found for the given filters")

    # Stream rows straight from DuckDB so responses for 100k+ rows start immediately.
    row_iter = _stream_prefixed_rows(context, payload, context.base_params, db)
    if file_format == "json":
        return StreamingResponse(
            stream_json_rows(row_iter),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=amr_records.json"}
        )

    return StreamingResponse(
        stream_csv(row_iter),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=amr_records.csv"}
    )
