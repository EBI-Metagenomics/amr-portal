import type { AMRRecord } from './amrRecord';
import type { FiltersConfig, FiltersView } from './filtersConfig';

export type SelectedFilter = {
  category: string;
  value: string;
};

export type AMRRecordsFetchParams = {
  filters: SelectedFilter[];
  viewId: FiltersView['id'];
  page: number;
  perPage: number;
  orderBy?: {
    category: string;
    order: 'ASC' | 'DESC';
  };
};

type PaginatedMetadata = {
  total_hits: number;
  page: number;
  per_page: number;
};

export type AMRRecordsResponse = {
  meta: PaginatedMetadata;
  data: AMRRecord[];
};

export type ReleaseInfo = {
  label: string;
};

export interface BackendInterface {
  getRelease: () => Promise<ReleaseInfo>;
  getFiltersConfig: () => Promise<FiltersConfig>;
  getAMRRecords: (params: AMRRecordsFetchParams) => Promise<AMRRecordsResponse>;
}
