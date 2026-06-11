"""CSV/JSON download streaming for filtered AMR records."""

from __future__ import annotations

import io
import json
from collections.abc import Iterator
from typing import Any

import duckdb
from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from core.config import get_settings
from core.constants import (
    EXPORT_FILENAME_CSV,
    EXPORT_FILENAME_JSON,
    EXPORT_STREAM_BATCH_SIZE,
)
from core.duckdb_conn import connect_duckdb
from core.serialization import normalize_value
from core.streaming import stream_csv, stream_json_rows
from models.payload import Payload
from services.filters.query_builder import (
    FilterQueryContext,
    append_order_clause,
    build_filter_query_context,
)
from services.filters.records import filter_amr_records

_settings = get_settings()


def _stream_prefixed_rows(
    context: FilterQueryContext,
    payload: Payload,
    query_params: list[Any],
    _db: duckdb.DuckDBPyConnection,
    batch_size: int = EXPORT_STREAM_BATCH_SIZE,
) -> Iterator[dict[str, Any]]:
    """Yield dataset-prefixed rows directly from DuckDB in bounded batches."""
    query = append_order_clause(context.base_query, payload, context.order_by_col)
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
                    col_name: normalize_value(value)
                    for col_name, value in zip(prefixed_columns, row, strict=True)
                }
    finally:
        stream_conn.close()


def fetch_filtered_records(
    payload: Payload,
    scope: str,
    file_format: str,
    db: duckdb.DuckDBPyConnection,
):
    """Download filtered AMR records in CSV or JSON format."""
    scope = (scope or "all").lower()
    if scope not in {"page", "all"}:
        raise HTTPException(status_code=400, detail="scope must be 'page' or 'all'")

    if scope == "page":
        data = filter_amr_records(payload, db)["data"]
        if not data:
            raise HTTPException(
                status_code=404,
                detail="No data found for the given filters",
            )

        if file_format == "json":
            content = json.dumps(data, ensure_ascii=False, indent=2)
            file_like = io.BytesIO(content.encode("utf-8"))
            return StreamingResponse(
                file_like,
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename={EXPORT_FILENAME_JSON}"},
            )

        return StreamingResponse(
            stream_csv(data),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={EXPORT_FILENAME_CSV}"},
        )

    context = build_filter_query_context(payload, db)
    total_hits = db.execute(context.count_query, context.count_params).fetchone()[0]
    if total_hits == 0:
        raise HTTPException(
            status_code=404,
            detail="No data found for the given filters",
        )

    row_iter = _stream_prefixed_rows(context, payload, context.base_params, db)
    if file_format == "json":
        return StreamingResponse(
            stream_json_rows(row_iter),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={EXPORT_FILENAME_JSON}"},
        )

    return StreamingResponse(
        stream_csv(row_iter),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={EXPORT_FILENAME_CSV}"},
    )
