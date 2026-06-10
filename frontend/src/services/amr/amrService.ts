import apiClient from '@services/common/apiInstance';
import type {
  AMRFacetsFetchParams,
  AMRFacetsResponse,
  AMRRecordsFetchParams,
  AMRRecordsResponse,
  BackendInterface,
  ReleaseInfo,
} from '@interfaces/amrApi';

class AMRService implements BackendInterface {
  async getRelease(): Promise<ReleaseInfo> {
    const response = await apiClient.get<ReleaseInfo>('/release');
    return response.data;
  }

  async getAMRRecords(params: AMRRecordsFetchParams): Promise<AMRRecordsResponse> {
    const payload: Record<string, unknown> = {
      selected_filters: params.filters,
      view_id: params.viewId,
      page: params.page,
      per_page: params.perPage,
      facet_operators: params.facetOperators ?? {},
    };

    if (params.orderBy) {
      payload.order_by = params.orderBy;
    }
    if (params.searchQuery) {
      payload.search_query = params.searchQuery;
    }

    const response = await apiClient.post<AMRRecordsResponse>('/amr-records', payload);
    return response.data;
  }

  async getAMRFacets(params: AMRFacetsFetchParams): Promise<AMRFacetsResponse> {
    const payload: Record<string, unknown> = {
      selected_filters: params.filters,
      facet_paging: params.facetPaging ?? {},
      facet_operators: params.facetOperators ?? {},
    };
    if (params.viewId !== undefined) {
      payload.view_id = params.viewId;
    }
    if (params.searchQuery) {
      payload.search_query = params.searchQuery;
    }
    const response = await apiClient.post<AMRFacetsResponse>('/amr-facets', payload);
    return response.data;
  }
}

export const amrService = new AMRService();
