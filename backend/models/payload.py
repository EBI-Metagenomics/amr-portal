from typing import Literal

from pydantic import BaseModel, Field


class SelectedFilter(BaseModel):
    category: str
    value: str


class OrderBy(BaseModel):
    category: str
    order: Literal["ASC", "DESC"]


class Payload(BaseModel):
    selected_filters: list[SelectedFilter] = Field(default_factory=list)
    view_id: int
    page: int | None = 1
    per_page: int | None = 100
    facet_operators: dict[str, Literal["AND", "OR"]] = Field(default_factory=dict)
    order_by: OrderBy | None = None
    search_query: str | None = None
