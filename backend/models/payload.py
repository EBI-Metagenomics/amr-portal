from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field

class SelectedFilter(BaseModel):
    category: str
    value: str

class OrderBy(BaseModel):
    category: str
    order: Literal["ASC", "DESC"]

class Payload(BaseModel):
    selected_filters: List[SelectedFilter] = Field(default_factory=list)
    view_id: int
    page: Optional[int] = 1
    per_page: Optional[int] = 100
    facet_operators: Dict[str, Literal["AND", "OR"]] = Field(default_factory=dict)
    order_by: Optional[OrderBy] = None
    search_query: Optional[str] = None
