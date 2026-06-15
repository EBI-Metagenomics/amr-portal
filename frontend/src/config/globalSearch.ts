/** Minimum characters before global search is sent to the API (matches backend). */
export const GLOBAL_SEARCH_MIN_LENGTH = 3;

/** URL query parameter used for deep links from the static home page. */
export const SEARCH_QUERY_URL_PARAM = 'q';

export const isGlobalSearchActive = (query: string): boolean =>
  query.trim().length >= GLOBAL_SEARCH_MIN_LENGTH;
