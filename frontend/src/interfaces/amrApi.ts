export type { AMRRecordsResponse } from './amrRecord';
import type { AMRRecordsResponse } from './amrRecord';
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

export type ReleaseInfo = {
  label: string;
};

export interface BackendInterface {
  getRelease: () => Promise<ReleaseInfo>;
  getFiltersConfig: () => Promise<FiltersConfig>;
  getAMRRecords: (params: AMRRecordsFetchParams) => Promise<AMRRecordsResponse>;
}
