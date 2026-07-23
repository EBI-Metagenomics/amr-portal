import type { FacetDataTypeSummary, FacetItem } from '@interfaces/amrApi';

export type FacetHeaderSummary = {
  filterSelectionCount: number;
  matchText: string;
  ariaLabel: string;
};

const formatCount = (value: number) => value.toLocaleString();

/**
 * Search-only hit count for the active result type (ignores facet filters).
 * Used for result-type badges, not facet headers.
 */
export const getActiveScopeTotal = (
  dataTypes: FacetDataTypeSummary[],
  currentViewId: string | number,
  isGlobalSearchActive: boolean
): number | null => {
  if (!isGlobalSearchActive) {
    return null;
  }
  const activeType =
    dataTypes.find(type => type.active) ??
    dataTypes.find(type => String(type.id) === String(currentViewId));
  if (activeType?.search_count == null) {
    return null;
  }
  return activeType.search_count;
};

const sumSelectedOptionCounts = (facet: FacetItem): number => {
  return facet.options.filter(option => option.selected).reduce((sum, option) => sum + option.count, 0);
};

/**
 * Facet header labels use the **current result set** size (`resultTotal`, typically
 * records `meta.total_hits` after search + filters), not search-only `search_count`.
 *
 * - No values selected in this facet: `All · N` (N = rows currently in the table).
 * - Values selected: `N results`, or `N of M` when the selected-option sum differs from N.
 */
export const buildFacetHeaderSummary = (
  facet: FacetItem,
  resultTotal: number | null
): FacetHeaderSummary => {
  const selectedCount = facet.selected_count;

  if (selectedCount === 0) {
    if (resultTotal != null && resultTotal > 0) {
      const matchText = `All · ${formatCount(resultTotal)}`;
      return {
        filterSelectionCount: 0,
        matchText,
        ariaLabel: `No ${facet.label.toLowerCase()} filters selected. All ${formatCount(resultTotal)} current results included.`,
      };
    }

    const visibleMatchTotal = facet.options.reduce((sum, option) => sum + option.count, 0);
    if (visibleMatchTotal > 0 && !facet.has_more) {
      const matchText = `${formatCount(visibleMatchTotal)} matches`;
      return {
        filterSelectionCount: 0,
        matchText,
        ariaLabel: `No ${facet.label.toLowerCase()} filters selected. ${matchText}.`,
      };
    }

    return {
      filterSelectionCount: 0,
      matchText: '',
      ariaLabel: `No ${facet.label.toLowerCase()} filters selected`,
    };
  }

  const filteredCount = sumSelectedOptionCounts(facet);
  const selectionLabel = `${selectedCount} ${facet.label.toLowerCase()} filter${
    selectedCount === 1 ? '' : 's'
  } selected`;

  if (resultTotal != null && resultTotal > 0) {
    // Prefer the live table total; only show "N of M" when option sums disagree (e.g. multi-select).
    const matchText =
      filteredCount > 0 && filteredCount !== resultTotal
        ? `${formatCount(filteredCount)} of ${formatCount(resultTotal)}`
        : `${formatCount(resultTotal)} results`;
    return {
      filterSelectionCount: selectedCount,
      matchText,
      ariaLabel: `${selectionLabel}. ${matchText}.`,
    };
  }

  if (filteredCount > 0) {
    const matchText = `${formatCount(filteredCount)} matches`;
    return {
      filterSelectionCount: selectedCount,
      matchText,
      ariaLabel: `${selectionLabel}. ${matchText}.`,
    };
  }

  return {
    filterSelectionCount: selectedCount,
    matchText: '',
    ariaLabel: selectionLabel,
  };
};
