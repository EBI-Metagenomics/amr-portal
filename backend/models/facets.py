from typing import Literal

from pydantic import BaseModel, Field

from models.payload import SelectedFilter


class FacetPageRequest(BaseModel):
    offset: int = 0
    limit: int = 10
    search: str | None = None


class FacetsPayload(BaseModel):
    selected_filters: list[SelectedFilter] = Field(default_factory=list)
    view_id: int
    facet_paging: dict[str, FacetPageRequest] = Field(default_factory=dict)
    facet_operators: dict[str, Literal["AND", "OR"]] = Field(default_factory=dict)
    search_query: str | None = None


class FacetOption(BaseModel):
    value: str
    label: str
    count: int
    selected: bool


class FacetDataTypeSummary(BaseModel):
    id: int
    name: str
    selected_count: int
    search_count: int | None = None
    active: bool


class FacetResponseItem(BaseModel):
    id: str
    label: str
    selected_count: int
    total_options: int
    options: list[FacetOption]
    has_more: bool
    next_offset: int | None = None


class FacetsResponse(BaseModel):
    data_type: list[FacetDataTypeSummary]
    facets: list[FacetResponseItem]
