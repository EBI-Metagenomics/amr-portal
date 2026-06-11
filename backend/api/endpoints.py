import base64

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel

from models.amr_records import AMRRecordsResponse
from models.filters_config import FiltersConfig
from models.facets import FacetsPayload, FacetsResponse
from models.payload import Payload
from models.release import Release
from services.filters import fetch_filters, filter_amr_records, fetch_filtered_records, fetch_amr_facets
from services.release import fetch_release
from core.database import run_in_db
from starlette.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

router = APIRouter(tags=["AMR"])


class HealthResponse(BaseModel):
    status: str

@router.get(
    "/filters-config",
    response_model=FiltersConfig,
    summary="Get AMR filter configuration",
    description="Returns available filter categories, views, grouped categories, and release metadata.",
    response_description="Filter configuration consumed by the AMR portal UI.",
)
def get_filters_config() -> FiltersConfig:
    filters: dict = run_in_db(fetch_filters)
    return FiltersConfig(**filters)


@router.post(
    "/amr-records",
    response_model=AMRRecordsResponse,
    summary="Fetch filtered AMR records",
    description="Returns paginated AMR records based on selected filters, view, pagination, and sort options.",
    response_description="Paginated AMR records including metadata and display columns.",
    responses={
        status.HTTP_400_BAD_REQUEST: {"description": "Invalid filter/sort/view parameters."},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"description": "Database query execution failed."},
    },
)
def get_amr_records(payload: Payload):
    return run_in_db(filter_amr_records, payload)


@router.post(
    "/amr-facets",
    response_model=FacetsResponse,
    summary="Fetch facet counts and options",
    description="Returns facet buckets with option counts and selected state for a given view and active filters.",
    response_description="Facet payload with data type summary and grouped facet options.",
    responses={
        status.HTTP_400_BAD_REQUEST: {"description": "Invalid facet payload or unsupported view."},
        status.HTTP_500_INTERNAL_SERVER_ERROR: {"description": "Facet query failed."},
    },
    include_in_schema=False,
)
def get_amr_facets(payload: FacetsPayload):
    return run_in_db(fetch_amr_facets, payload)


@router.post(
    "/amr-records/download",
    response_class=StreamingResponse,
    summary="Download filtered AMR records",
    description="Downloads filtered AMR records as CSV or JSON, scoped to current page or all matching rows.",
    responses={
        status.HTTP_200_OK: {
            "description": "Streamed file download.",
            "content": {"text/csv": {}, "application/json": {}},
        },
        status.HTTP_400_BAD_REQUEST: {"description": "Invalid scope or file format."},
        status.HTTP_404_NOT_FOUND: {"description": "No records found for supplied filters."},
    },
)
def download_filtered_records(
    payload: Payload,
    scope: str = Query("all", pattern="^(page|all)$"),
    file_format: str = Query("csv", pattern="^(csv|json)$"),
):
    return run_in_db(fetch_filtered_records, payload, scope, file_format)


def _b64url_decode_to_str(s: str) -> str:
    # URL-safe Base64 often omits padding characters (=)
    # This adds the missing padding for URL-safe Base64
    s = s.strip()
    s += "=" * (-len(s) % 4)
    try:
        return base64.urlsafe_b64decode(s).decode("utf-8")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Base64 in 'payload': {e}")

@router.get(
    "/amr-records/download",
    response_class=StreamingResponse,
    summary="Download filtered AMR records (GET)",
    description="GET variant of file download endpoint. Accepts Base64 URL-safe JSON encoded payload matching the Payload schema.",
    responses={
        status.HTTP_200_OK: {
            "description": "Streamed file download.",
            "content": {"text/csv": {}, "application/json": {}},
        },
        status.HTTP_400_BAD_REQUEST: {"description": "Invalid Base64 payload, JSON payload, or query parameters."},
        status.HTTP_404_NOT_FOUND: {"description": "No records found for supplied filters."},
    },
)
async def download_filtered_records_get(
    payload: str = Query(..., description="Base64 URL-safe encoded JSON matching the Payload schema"),
    scope: str = Query("all", description="Either 'page' or 'all'", pattern="^(page|all)$"),
    file_format: str = Query("csv", description="Either 'csv' or 'json'", pattern="^(csv|json)$"),
):
    """
    GET version of /amr-records/download.
    - Keeps Base64-encoded JSON `payload`.
    - Forwards the StreamingResponse (CSV) or dict (JSON) returned by fetch_filtered_records.
    """
    decoded = _b64url_decode_to_str(payload)
    try:
        payload_obj = Payload.model_validate_json(decoded)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid 'payload' JSON: {e}")

    result = await run_in_threadpool(
        run_in_db, fetch_filtered_records, payload_obj, scope, file_format
    )

    if isinstance(result, StreamingResponse):
        return result

    return result


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Lightweight endpoint to verify that the API process is up and serving requests.",
)
def health() -> HealthResponse:
    return HealthResponse(status="Healthy: OK")


@router.get(
    "/release",
    response_model=Release,
    summary="Get release metadata",
    description="Returns the current AMR release label used to annotate UI and data exports.",
)
def get_release() -> Release:
    release = run_in_db(fetch_release)
    if release is None:
        raise HTTPException(status_code=404, detail="Release metadata not found")
    return Release(**release)
