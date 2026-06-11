"""SQL query construction for filtered AMR record retrieval."""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

import duckdb
from fastapi import HTTPException

from core.sql_utils import quote_column_name
from models.payload import Payload
from services.filters.metadata import (
    check_selected_filters,
    get_dataset_from_view,
    get_display_column_details,
    get_table_columns,
)
from services.global_search import (
    compose_search_query,
    merge_search_predicate,
    require_filters_or_search,
    resolve_search_prefix,
)

logger = logging.getLogger(__name__)


@dataclass
class FilterQueryContext:
    """Container for all SQL/query metadata needed to stream AMR records."""

    dataset: str
    base_query: str
    count_query: str
    base_params: list[Any]
    count_params: list[Any]
    display_column_details: dict
    order_by_col: str | None


def append_order_clause(
    query: str,
    payload: Payload,
    order_by_col: str | None,
) -> str:
    """Add an ORDER BY clause if the payload specifies a sortable column."""
    if payload.order_by and order_by_col:
        return f"{query} ORDER BY {quote_column_name(order_by_col)} {payload.order_by.order}"
    return query


def group_selected_filters_with_operator(
    selected_filters: list[Any],
    facet_operators: dict[str, str] | None = None,
    excluded_category: str | None = None,
) -> dict[str, dict[str, Any]]:
    grouped_filters: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"values": [], "operator": "OR"}
    )
    for selected in selected_filters:
        if excluded_category and selected.category == excluded_category:
            continue
        trimmed_filter_category = selected.category.split("-")[-1]
        operator = (facet_operators or {}).get(selected.category, "OR").upper()
        grouped_filters[trimmed_filter_category]["values"].append(selected.value)
        grouped_filters[trimmed_filter_category]["operator"] = "AND" if operator == "AND" else "OR"
    return grouped_filters


def build_where_clause(
    grouped_filters: dict[str, dict[str, Any]],
) -> tuple[str, list[Any]]:
    where_clauses = []
    params: list[Any] = []
    for category, details in grouped_filters.items():
        values = details["values"]
        operator = details.get("operator", "OR")
        if operator == "AND":
            and_clause = " AND ".join([f"{quote_column_name(category)} = ?" for _ in values])
            params.extend(values)
            where_clauses.append(f"({and_clause})")
        else:
            tuple_clause = f"({', '.join(['?'] * len(values))})"
            params.extend(values)
            where_clauses.append(f"{quote_column_name(category)} IN {tuple_clause}")
    return " AND ".join(where_clauses), params


def build_filter_query_context(
    payload: Payload,
    db: duckdb.DuckDBPyConnection,
) -> FilterQueryContext:
    """Pre-compute shared SQL fragments/metadata for paged and streaming exports."""
    selected_view_id = payload.view_id
    if not selected_view_id:
        raise HTTPException(
            status_code=400,
            detail="Please specify a view ID to filter by.",
        )

    selected_dataset = get_dataset_from_view(selected_view_id, db)
    valid_columns = get_table_columns(selected_dataset, db)
    columns_to_display = get_display_column_details(selected_view_id, db)

    quoted_columns = [quote_column_name(col) for col in columns_to_display["name"]]
    columns_to_display_str = ", ".join(quoted_columns)

    columns_to_display_dict = columns_to_display.to_dict("records")
    display_column_details = {r["fullname"]: r for r in columns_to_display_dict}

    grouped_filters_with_operator = group_selected_filters_with_operator(
        payload.selected_filters,
        payload.facet_operators,
    )
    grouped_filters = {
        category: details["values"] for category, details in grouped_filters_with_operator.items()
    }

    are_filters_valid = check_selected_filters(grouped_filters, valid_columns)
    logger.info("are_filters_valid: %s", are_filters_valid)
    logger.info("selected_view_id: %s", selected_view_id)
    logger.info("selected_dataset: %s", selected_dataset)
    logger.info("grouped_filters: %s", grouped_filters)
    logger.info("quoted_columns: %s", quoted_columns)

    if not are_filters_valid:
        raise HTTPException(
            status_code=400,
            detail="Something is wrong with the filters, double check the category values.",
        )

    order_by_col = None
    if payload.order_by:
        order_by_col = payload.order_by.category.split("-")[-1]
        if order_by_col not in valid_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid order_by column: {order_by_col!r}",
            )

    where_sql, where_params = build_where_clause(grouped_filters_with_operator)
    search_prefix = resolve_search_prefix(payload.search_query, db)
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
