from typing import Any

from pydantic import BaseModel


class AMRColumnMeta(BaseModel):
    id: str
    label: str
    sortable: bool
    type: str
    url_template: str | None = None


class AMRRecordsMeta(BaseModel):
    total_hits: int
    page: int
    per_page: int
    columns: list[AMRColumnMeta]


class AMRRecordsResponse(BaseModel):
    meta: AMRRecordsMeta
    data: list[dict[str, Any]]
