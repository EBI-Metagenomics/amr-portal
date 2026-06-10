export const getDownloadLink = ({
  apiBaseUrl,
  viewId,
  selectedFilters,
  searchQuery,
}: {
  apiBaseUrl: string;
  viewId: string | number;
  selectedFilters: Array<{ category: string; value: string }>;
  searchQuery?: string;
}) => {
  const payload: Record<string, unknown> = {
    view_id: viewId,
    selected_filters: selectedFilters,
  };
  if (searchQuery) {
    payload.search_query = searchQuery;
  }
  const encodedPayload = btoa(JSON.stringify(payload));
  const url = new URL(`${apiBaseUrl}/amr-records/download`, window.location.origin);
  url.searchParams.set('payload', encodedPayload);
  return url.toString();
};
