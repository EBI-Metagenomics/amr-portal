"""Paginated AMR record retrieval for the UI."""

from __future__ import annotations

import logging

import duckdb
from fastapi import HTTPException

from core.constants import DEFAULT_PAGE, DEFAULT_PER_PAGE
from core.serialization import build_columns_metadata, normalize_value, serialize_record_row
from models.payload import Payload
from services.filters.query_builder import append_order_clause, build_filter_query_context

logger = logging.getLogger(__name__)


def filter_amr_records(payload: Payload, db: duckdb.DuckDBPyConnection) -> dict:
    """Fetch a single page of AMR results for UI consumption."""
    context = build_filter_query_context(payload, db)
    page = payload.page or DEFAULT_PAGE
    per_page = payload.per_page or DEFAULT_PER_PAGE

    try:
        logger.info("selected_filters: %s", payload.selected_filters)
        logger.info("count_query: %s", context.count_query)

        total_hits = db.execute(context.count_query, context.count_params).fetchone()[0]

        offset = (page - 1) * per_page
        paginated_query = append_order_clause(
            context.base_query,
            payload,
            context.order_by_col,
        )
        paginated_query += " LIMIT ? OFFSET ?"
        paginated_params = [*context.base_params, per_page, offset]
        logger.info("base_query: %s", paginated_query)

        res_df = db.execute(paginated_query, paginated_params).fetchdf()
        res_df = res_df.map(normalize_value)
        res_df = res_df.add_prefix(f"{context.dataset}-")
        columns_meta = build_columns_metadata(context.display_column_details)
        result = [
            serialize_record_row(
                row.to_dict(),
                columns_meta,
                context.display_column_details,
            )
            for _, row in res_df.iterrows()
        ]

        return {
            "meta": {
                "total_hits": total_hits,
                "page": page,
                "per_page": per_page,
                "columns": columns_meta,
            },
            "data": result,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Database query failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Database query failed, see the logs for more details",
        ) from e
