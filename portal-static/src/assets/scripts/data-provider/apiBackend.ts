import type { BackendInterface, AMRRecordsFetchParams, AMRRecordsResponse } from './backendInterface';
import type { FiltersConfig, FiltersView } from '../types/filters/filtersConfig';

type OldFiltersView = FiltersView & {
  otherCategoryGroups: FiltersView['categoryGroups'];
};

type OldFiltersConfig = Omit<FiltersConfig, 'filterViews'> & {
  filterViews: OldFiltersView[];
};

export class ApiBackend implements BackendInterface {
  apiUrl: string;

  constructor() {
    const hostname = window.location.hostname;
    const isDev = hostname === 'localhost';

    // TODO: this should probably be read from the environment
    const devApiUrl = 'http://localhost:8000/api';
    const prodApiUrl = '/amr/api';

    this.apiUrl = isDev ? devApiUrl : prodApiUrl;
  }

  getFiltersConfig = async (): Promise<FiltersConfig> => {
    const response = await fetch(`${this.apiUrl}/filters-config`);
    if (!response.ok) {
      throw new Error(`Failed to fetch filters config: ${response.statusText}`);
    }

    // NOTE: There no longer seems to be any distinction between the main filters category,
    // and all other filter categories.
    // Merging them here, on the client; but we should update this on the server

    const config: OldFiltersConfig = await response.json();
    config.filterViews = config.filterViews.map(view => ({
      ...view,
      categoryGroups: [...view.categoryGroups, ...view.otherCategoryGroups]
    }));


    return config;
  };

  getAMRRecords = async (params: AMRRecordsFetchParams): Promise<AMRRecordsResponse> => {
    const payload: Record<string, unknown> = {
      selected_filters: params.filters,
      view_id: params.viewId,
      page: params.page,
      per_page: params.perPage
    };

    if (params.orderBy) {
      payload.order_by = params.orderBy;
    }

    const response = await fetch(`${this.apiUrl}/amr-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch biosamples: ${response.statusText}`);
    }
    return await response.json();
  };

}
