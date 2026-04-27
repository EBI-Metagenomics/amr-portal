import apiClient from '@services/common/apiInstance';
import type {
  AMRRecordsFetchParams,
  AMRRecordsResponse,
  BackendInterface,
  ReleaseInfo,
} from '@interfaces/amrApi';
import type { FiltersConfig, FiltersView } from '@interfaces/filtersConfig';

type OldFiltersView = FiltersView & {
  otherCategoryGroups: FiltersView['categoryGroups'];
};

type OldFiltersConfig = Omit<FiltersConfig, 'filterViews'> & {
  filterViews: OldFiltersView[];
};

class AMRService implements BackendInterface {
  async getRelease(): Promise<ReleaseInfo> {
    const response = await apiClient.get<ReleaseInfo>('/release');
    return response.data;
  }

  async getFiltersConfig(): Promise<FiltersConfig> {
    const response = await apiClient.get<OldFiltersConfig>('/filters-config');
    const config = response.data;

    config.filterViews = config.filterViews.map(view => ({
      ...view,
      categoryGroups: [...view.categoryGroups, ...view.otherCategoryGroups],
    }));

    return config;
  }

  async getAMRRecords(params: AMRRecordsFetchParams): Promise<AMRRecordsResponse> {
    const payload: Record<string, unknown> = {
      selected_filters: params.filters,
      view_id: params.viewId,
      page: params.page,
      per_page: params.perPage,
    };

    if (params.orderBy) {
      payload.order_by = params.orderBy;
    }

    const response = await apiClient.post<AMRRecordsResponse>('/amr-records', payload);
    return response.data;
  }
}

export const amrService = new AMRService();
