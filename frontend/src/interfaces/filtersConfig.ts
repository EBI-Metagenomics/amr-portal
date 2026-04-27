export type Filter = {
  label: string;
  value: string;
};

export type FilterCategory = {
  id: string;
  label: string;
  filters: Filter[];
};

export type FilterCategoriesMap = Record<string, FilterCategory>;

export type FilterCategoryGroup = {
  name: string;
  categories: string[];
};

export type AMRTableColumn = {
  id: string | number;
  label: string;
  sortable: boolean;
  rank: number;
  enable_by_default: boolean;
};

export type FiltersView = {
  id: number | string;
  name: string;
  url_name: string;
  categoryGroups: FilterCategoryGroup[];
  columns: AMRTableColumn[];
};

export type FiltersConfig = {
  filterCategories: FilterCategoriesMap;
  filterViews: FiltersView[];
};
