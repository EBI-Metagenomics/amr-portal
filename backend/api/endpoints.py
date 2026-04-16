import base64

import duckdb
from fastapi import APIRouter, Query, HTTPException, Depends

from backend.models.filters_config import FiltersConfig
from backend.models.release import Release
from backend.models.payload import Payload
from backend.services.filters import fetch_filters, filter_amr_records, fetch_filtered_records
from backend.services.release import fetch_release
from backend.core.database import get_db_connection
from starlette.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

router = APIRouter()

@router.get("/filters-config", response_model=FiltersConfig)
def get_filters_config(db: duckdb.DuckDBPyConnection = Depends(get_db_connection)) -> FiltersConfig:
    filters: dict = fetch_filters(db)
    return FiltersConfig(**filters)

@router.post("/amr-records")
def get_amr_records(
    payload: Payload,
    db: duckdb.DuckDBPyConnection = Depends(get_db_connection)
):
    return filter_amr_records(payload, db)

@router.post("/amr-records/download")
def download_filtered_records(
    payload: Payload,
    scope: str = "all",
    file_format: str = "csv",
    db: duckdb.DuckDBPyConnection = Depends(get_db_connection)
):
    return fetch_filtered_records(payload, scope, file_format, db)


def _b64url_decode_to_str(s: str) -> str:
    # URL-safe Base64 often omits padding characters (=)
    # This adds the missing padding for URL-safe Base64
    s = s.strip()
    s += "=" * (-len(s) % 4)
    try:
        return base64.urlsafe_b64decode(s).decode("utf-8")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Base64 in 'payload': {e}")

@router.get("/amr-records/download")
async def download_filtered_records_get(
    payload: str = Query(..., description="Base64 URL-safe encoded JSON matching the Payload schema"),
    scope: str = Query("all", description="Either 'page' or 'all'"),
    file_format: str = Query("csv", description="Either 'csv' or 'json'"),
    db: duckdb.DuckDBPyConnection = Depends(get_db_connection),
):
    """
    GET version of /amr-records/download.
    - Keeps Base64-encoded JSON `payload`.
    - Forwards the StreamingResponse (CSV) or dict (JSON) returned by fetch_filtered_records.
    """
    # Decode and validate the payload into your Pydantic model
    decoded = _b64url_decode_to_str(payload)
    try:
        payload_obj = Payload.model_validate_json(decoded)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid 'payload' JSON: {e}")

    # Moves the blocking I/O operations to a separate thread pool (DuckDB queries, file operations)
    result = await run_in_threadpool(fetch_filtered_records, payload_obj, scope, file_format, db)

    # If the service already streams CSV, just return it.
    if isinstance(result, StreamingResponse):
        return result

    # Otherwise (e.g., JSON path returns a dict), return as-is.
    return result


@router.get('/health')
def health():
    # Health checks for ensuring application is healthy
    # expand to include databae connectivity check etc
    return "Healthy: OK", 200


@router.get("/release", response_model=Release)
def get_release(db: duckdb.DuckDBPyConnection = Depends(get_db_connection)) -> Release:
    release: dict = fetch_release(db)
    return Release(**release)
