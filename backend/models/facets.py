from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from models.payload import SelectedFilter


class FacetPageRequest(BaseModel):
    offset: int = 0
    limit: int = 10
    search: Optional[str] = None


class FacetsPayload(BaseModel):
    selected_filters: List[SelectedFilter]
    view_id: int
    facet_paging: Dict[str, FacetPageRequest] = Field(default_factory=dict)
    facet_operators: Dict[str, Literal["AND", "OR"]] = Field(default_factory=dict)


class FacetOption(BaseModel):
    value: str
    label: str
    count: int
    selected: bool


class FacetDataTypeSummary(BaseModel):
    id: int
    name: str
    selected_count: int
    active: bool


class FacetResponseItem(BaseModel):
    id: str
    label: str
    selected_count: int
    total_options: int
    options: List[FacetOption]
    has_more: bool
    next_offset: Optional[int] = None


class FacetsResponse(BaseModel):
    data_type: List[FacetDataTypeSummary]
    facets: List[FacetResponseItem]
