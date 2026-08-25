import { trackEvent } from './matomo';
import { AMR_ANALYTICS_CATEGORY, AMR_VIEW_ANALYTICS_LABELS } from './constants';

export function viewLabel(viewId: string | number | null | undefined): string {
  if (viewId == null) return 'unknown';
  const key = String(viewId);
  return AMR_VIEW_ANALYTICS_LABELS[key] ?? key;
}

/** Query length buckets for Matomo event value (not the raw query). */
export function searchLengthBucket(query: string): number {
  const len = query.trim().length;
  if (len <= 5) return 5;
  if (len <= 10) return 10;
  if (len <= 20) return 20;
  return 21;
}

export function trackSearchSubmit(hasHits: boolean, query: string): void {
  trackEvent(
    AMR_ANALYTICS_CATEGORY,
    'search_submit',
    hasHits ? 'hits' : 'zero',
    searchLengthBucket(query)
  );
}

export function trackResultTypeChange(viewId: string | number): void {
  trackEvent(AMR_ANALYTICS_CATEGORY, 'result_type_change', viewLabel(viewId));
}

export function trackFacetSelect(facetId: string, activeFilterCount: number): void {
  trackEvent(AMR_ANALYTICS_CATEGORY, 'facet_select', facetId, activeFilterCount);
}

export function trackGenomeViewerOpen(
  viewId: string | number,
  options?: { geneSymbol?: string | null; locusTag?: string | null }
): void {
  const parts = [viewLabel(viewId)];
  const geneSymbol = options?.geneSymbol?.trim();
  const locusTag = options?.locusTag?.trim();
  if (geneSymbol) parts.push(geneSymbol);
  if (locusTag) parts.push(locusTag);
  trackEvent(AMR_ANALYTICS_CATEGORY, 'genome_viewer_open', parts.join(':'));
}

export function trackDownloadStart(viewId: string | number): void {
  trackEvent(AMR_ANALYTICS_CATEGORY, 'download_start', viewLabel(viewId));
}
