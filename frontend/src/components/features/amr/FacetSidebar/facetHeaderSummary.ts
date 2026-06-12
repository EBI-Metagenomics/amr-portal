import type { FacetDataTypeSummary, FacetItem } from '@interfaces/amrApi';

export type FacetHeaderSummary = {
  filterSelectionCount: number;
  matchText: string;
  ariaLabel: string;
};

const formatCount = (value: number) => value.toLocaleString();

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
 * Build facet header labels that separate:
 * - how many facet values are selected (filter badge), vs
 * - how many records match in the current scope (match summary).
 */
export const buildFacetHeaderSummary = (
  facet: FacetItem,
  scopeTotal: number | null
): FacetHeaderSummary => {
  const selectedCount = facet.selected_count;

  if (selectedCount === 0) {
    if (scopeTotal != null && scopeTotal > 0) {
      const matchText = `All · ${formatCount(scopeTotal)}`;
      return {
        filterSelectionCount: 0,
        matchText,
        ariaLabel: `No ${facet.label.toLowerCase()} filters selected. ${matchText} records in scope.`,
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

  if (scopeTotal != null && filteredCount > 0) {
    const matchText = `${formatCount(filteredCount)} of ${formatCount(scopeTotal)}`;
    return {
      filterSelectionCount: selectedCount,
      matchText,
      ariaLabel: `${selectedCount} ${facet.label.toLowerCase()} filter${
        selectedCount === 1 ? '' : 's'
      } selected. ${matchText} records.`,
    };
  }

  if (filteredCount > 0) {
    const matchText = `${formatCount(filteredCount)} matches`;
    return {
      filterSelectionCount: selectedCount,
      matchText,
      ariaLabel: `${selectedCount} ${facet.label.toLowerCase()} filter${
        selectedCount === 1 ? '' : 's'
      } selected. ${matchText}.`,
    };
  }

  return {
    filterSelectionCount: selectedCount,
    matchText: '',
    ariaLabel: `${selectedCount} ${facet.label.toLowerCase()} filter${
      selectedCount === 1 ? '' : 's'
    } selected`,
  };
};
