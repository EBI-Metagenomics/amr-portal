export type Filter = {
  label: string;
  value: string; // ??? how do we represent null values?
};

export type FilterCategory = {
  id: string;
  label: string;
  filters: Filter[];
};

export type FilterCategoriesMap = Record<string, FilterCategory>;

export type FilterCategoryGroup = {
  name: string;
  categories: string[]; // an array of filter category ids
};

/**
 * The fact that the columns of the AMR table are described in this config
 * suggests that it is more than just a filters config; but rather an overall app config
 */
export type AMRTableColumn = {
  id: string | number;
  label: string;
  sortable: boolean;
  rank: number; // <-- describes the order of the columns
  enable_by_default: boolean;
};

export type FiltersView = {
  id: number | string;
  name: string;
  url_name: string; // the url identifier of the view
  categoryGroups: FilterCategoryGroup[]; // order in the array will be used for display order
  columns: AMRTableColumn[];
};

export type FiltersConfig = {
  filterCategories: FilterCategoriesMap;
  filterViews: FiltersView[];
};