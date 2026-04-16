from pydantic import BaseModel, Field, ConfigDict


class FilterOption(BaseModel):
    label: str
    value: str


class FilterCategory(BaseModel):
    # e.g. "genotype-genome", "phenotype-Antibiotic_abbreviation"
    id: str
    label: str
    # e.g. "genotype" | "phenotype"
    dataset: str
    filters: list[FilterOption]


class Column(BaseModel):
    # e.g. "phenotype-Antibiotic_name"
    id: str
    label: str
    sortable: bool
    rank: int
    enable_by_default: bool = Field(alias="enable_by_default")


class CategoryGroup(BaseModel):
    name: str
    # list of category ids (column_id strings), e.g. ["phenotype-Antibiotic_abbreviation"]
    categories: list[str]


class FilterView(BaseModel):
    id: int
    url_name: str
    name: str
    categoryGroups: list[CategoryGroup]
    otherCategoryGroups: list[CategoryGroup]
    columns: list[Column]


class FiltersConfig(BaseModel):
    model_config = ConfigDict(validate_by_name=True)

    filter_categories: dict[str, FilterCategory] = Field(alias="filterCategories")
    filter_views: list[FilterView] = Field(alias="filterViews")
    release: dict = Field()
