export type { AMRRecordsResponse } from './amrRecord';
import type { AMRRecordsResponse } from './amrRecord';

export type SelectedFilter = {
  category: string;
  value: string;
};

export type FacetOperator = 'OR' | 'AND';

export type AMRRecordsFetchParams = {
  filters: SelectedFilter[];
  viewId: string | number;
  page: number;
  perPage: number;
  facetOperators?: Record<string, FacetOperator>;
  orderBy?: {
    category: string;
    order: 'ASC' | 'DESC';
  };
};

export type FacetPageState = {
  offset?: number;
  limit?: number;
  search?: string;
};

export type AMRFacetsFetchParams = {
  filters: SelectedFilter[];
  viewId?: string | number;
  facetPaging?: Record<string, FacetPageState>;
  facetOperators?: Record<string, FacetOperator>;
};

export type FacetOption = {
  value: string;
  label: string;
  count: number;
  selected: boolean;
};

export type FacetDataTypeSummary = {
  id: number;
  name: string;
  selected_count: number;
  active: boolean;
};

export type FacetItem = {
  id: string;
  label: string;
  selected_count: number;
  total_options: number;
  options: FacetOption[];
  has_more: boolean;
  next_offset?: number | null;
};

export type AMRFacetsResponse = {
  data_type: FacetDataTypeSummary[];
  facets: FacetItem[];
};

export type ReleaseInfo = {
  label: string;
};

export interface BackendInterface {
  getRelease: () => Promise<ReleaseInfo>;
  getAMRRecords: (params: AMRRecordsFetchParams) => Promise<AMRRecordsResponse>;
  getAMRFacets: (params: AMRFacetsFetchParams) => Promise<AMRFacetsResponse>;
}
