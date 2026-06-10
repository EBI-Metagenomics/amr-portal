/** Minimum characters before global search is sent to the API (matches backend). */
export const GLOBAL_SEARCH_MIN_LENGTH = 3;

export const isGlobalSearchActive = (query: string): boolean =>
  query.trim().length >= GLOBAL_SEARCH_MIN_LENGTH;
