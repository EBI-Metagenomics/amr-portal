import type { FacetDataTypeSummary } from '@interfaces/amrApi';

export const VIEW_EXPERIMENTS = 1;
export const VIEW_PREDICTIONS = 2;
export const VIEW_COMBINED = 3;

/**
 * Provisional view used when landing-page search arrives as `/data/?q=...`
 * with no `view` param. Facets still require a view_id; combined is the
 * preferred starting point before we may switch based on search_count.
 */
export const LANDING_SEARCH_PROVISIONAL_VIEW = VIEW_COMBINED;

/** Pick a result tab for a landing-page search when no view is in the URL. */
export function pickSearchResultView(dataTypes: FacetDataTypeSummary[]): number {
  const searchCount = (id: number) => dataTypes.find(type => type.id === id)?.search_count ?? 0;

  const combinedHits = searchCount(VIEW_COMBINED);
  if (combinedHits > 0) return VIEW_COMBINED;

  const predictionsHits = searchCount(VIEW_PREDICTIONS);
  if (predictionsHits > 0) return VIEW_PREDICTIONS;

  const experimentsHits = searchCount(VIEW_EXPERIMENTS);
  if (experimentsHits > 0) return VIEW_EXPERIMENTS;

  return VIEW_COMBINED;
}
