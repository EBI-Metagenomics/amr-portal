"""Facet counts and options for the filter sidebar."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

import duckdb

from core.constants import FACET_DEFAULT_LIMIT, FACET_MAX_LIMIT
from core.sql.filters import (
    LIST_VIEWS_SQL,
    VIEW_FACET_DEFINITIONS_SQL,
    facet_option_labels_sql,
)
from core.sql_utils import quote_column_name
from models.facets import FacetsPayload
from services.filters.metadata import (
    get_dataset_from_view,
    get_table_columns,
    get_view_dataset_map,
)
from services.filters.query_builder import (
    build_where_clause,
    group_selected_filters_with_operator,
)
from services.global_search import (
    compose_search_query,
    fetch_search_counts_by_dataset,
    merge_search_predicate,
    resolve_search_prefix,
)


def _fetch_view_facet_definitions(
    view_id: int,
    db: duckdb.DuckDBPyConnection,
) -> list[dict[str, Any]]:
    rows = db.execute(VIEW_FACET_DEFINITIONS_SQL, [view_id]).fetchall()
    facets: list[dict[str, Any]] = []
    seen = set()
    for row in rows:
        facet_id = row[0]
        if facet_id in seen:
            continue
        seen.add(facet_id)
        facets.append({"id": facet_id, "label": row[1]})
    return facets


def _fetch_facet_option_labels(
    facet_ids: list[str],
    db: duckdb.DuckDBPyConnection,
) -> dict[str, dict[str, str]]:
    if not facet_ids:
        return {}
    rows = db.execute(facet_option_labels_sql(len(facet_ids)), facet_ids).fetchall()
    result: dict[str, dict[str, str]] = defaultdict(dict)
    for facet_id, value, label in rows:
        result[facet_id][str(value)] = str(label)
    return result


def _fetch_data_type_summary(
    selected_filters: list[Any],
    current_view_id: int,
    db: duckdb.DuckDBPyConnection,
    search_prefix: str | None = None,
) -> list[dict[str, Any]]:
    rows = db.execute(LIST_VIEWS_SQL).fetchall()
    view_dataset_map = get_view_dataset_map(db)
    selected_by_dataset: dict[str, int] = defaultdict(int)
    for selected in selected_filters:
        dataset_name = selected.category.split("-")[0]
        selected_by_dataset[dataset_name] += 1
    search_counts = fetch_search_counts_by_dataset(db, search_prefix) if search_prefix else {}
    summaries = []
    for view_id, name in rows:
        dataset_name = view_dataset_map.get(int(view_id))
        if dataset_name is None:
            continue
        summary: dict[str, Any] = {
            "id": int(view_id),
            "name": str(name),
            "selected_count": int(selected_by_dataset.get(str(dataset_name), 0)),
            "active": int(view_id) == int(current_view_id),
        }
        if search_prefix:
            summary["search_count"] = int(search_counts.get(str(dataset_name), 0))
        summaries.append(summary)
    return summaries


def fetch_amr_facets(payload: FacetsPayload, db: duckdb.DuckDBPyConnection) -> dict:
    selected_view_id = payload.view_id
    selected_dataset = get_dataset_from_view(selected_view_id, db)
    valid_columns = get_table_columns(selected_dataset, db)
    facet_definitions = _fetch_view_facet_definitions(selected_view_id, db)
    facet_option_labels = _fetch_facet_option_labels(
        [facet["id"] for facet in facet_definitions],
        db,
    )
    search_prefix = resolve_search_prefix(payload.search_query, db)
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

        facet_operator = payload.facet_operators.get(facet_id, "OR").upper()
        excluded_category = None if facet_operator == "AND" else facet_id
        grouped_filters = group_selected_filters_with_operator(
            payload.selected_filters,
            payload.facet_operators,
            excluded_category=excluded_category,
        )
        where_sql, where_params = build_where_clause(grouped_filters)
        where_sql = merge_search_predicate(where_sql, search_prefix)
        paging = payload.facet_paging.get(facet_id) if payload.facet_paging else None
        limit = max(
            1,
            min(FACET_MAX_LIMIT, (paging.limit if paging else FACET_DEFAULT_LIMIT)),
        )
        offset = max(0, paging.offset if paging else 0)
        search = paging.search.strip() if paging and paging.search else ""
        facet_params: list[Any] = list(where_params)

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
            base_count_query += f" AND LOWER(CAST({facet_value_expr} AS VARCHAR)) LIKE ?"
            total_options_query += f" AND LOWER(CAST({facet_value_expr} AS VARCHAR)) LIKE ?"
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
            selected.value for selected in payload.selected_filters if selected.category == facet_id
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
