export const getDownloadLink = ({
  apiBaseUrl,
  viewId,
  selectedFilters,
}: {
  apiBaseUrl: string;
  viewId: string | number;
  selectedFilters: Array<{ category: string; value: string }>;
}) => {
  const payload = {
    view_id: viewId,
    selected_filters: selectedFilters,
  };
  const encodedPayload = btoa(JSON.stringify(payload));
  const url = new URL(`${apiBaseUrl}/amr-records/download`, window.location.origin);
  url.searchParams.set('payload', encodedPayload);
  return url.toString();
};
