import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FacetOperator, FacetPageState, SelectedFilter } from '@interfaces/amrApi';
import { isGlobalSearchActive, SEARCH_QUERY_URL_PARAM } from '@/config/globalSearch';

const DEFAULT_PER_PAGE = 100;
const DEFAULT_VIEW_ID = 1;
const VIEW_SLUG_TO_ID: Record<string, number> = {
  experiments: 1,
  predictions: 2,
  combined: 3,
};

export type SortState = {
  category: string;
  order: 'asc' | 'desc';
} | null;

export const useAmrPortalState = () => {
  const [viewId, setViewId] = useState<string | number | null>(null);
  const [selectedFiltersByView, setSelectedFiltersByView] = useState<Record<string, SelectedFilter[]>>({});
  const [activeGroupByView, setActiveGroupByView] = useState<Record<string, string | null>>({});
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [sort, setSort] = useState<SortState>(null);
  const [expandedFacetsByView, setExpandedFacetsByView] = useState<Record<string, Record<string, boolean>>>(
    {}
  );
  const [facetPagingByView, setFacetPagingByView] = useState<Record<string, Record<string, FacetPageState>>>(
    {}
  );
  const [facetOperatorsByView, setFacetOperatorsByView] = useState<Record<string, Record<string, FacetOperator>>>(
    {}
  );
  const initialUrlState = useMemo(() => {
    const params = new URL(window.location.href).searchParams;
    const fromView = params.get('view');
    let viewIdFromUrl = DEFAULT_VIEW_ID;
    if (fromView) {
      const parsed = Number(fromView);
      viewIdFromUrl = Number.isInteger(parsed) ? parsed : (VIEW_SLUG_TO_ID[fromView] ?? DEFAULT_VIEW_ID);
    }
    const searchFromUrl = params.get(SEARCH_QUERY_URL_PARAM)?.trim() ?? '';
    return { viewIdFromUrl, searchFromUrl };
  }, []);

  const [searchQuery, setSearchQueryState] = useState(initialUrlState.searchFromUrl);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(initialUrlState.searchFromUrl);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const activeSearchQuery = isGlobalSearchActive(debouncedSearchQuery) ? debouncedSearchQuery : undefined;

  const resolvedViewId = viewId ?? initialUrlState.viewIdFromUrl;

  useEffect(() => {
    if (!resolvedViewId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', String(resolvedViewId));
    const trimmedSearch = searchQuery.trim();
    if (isGlobalSearchActive(trimmedSearch)) {
      url.searchParams.set(SEARCH_QUERY_URL_PARAM, trimmedSearch);
    } else {
      url.searchParams.delete(SEARCH_QUERY_URL_PARAM);
    }
    window.history.replaceState(null, '', url);
  }, [resolvedViewId, searchQuery]);

  const selectedFilters = useMemo(() => {
    if (!resolvedViewId) return [];
    return selectedFiltersByView[String(resolvedViewId)] ?? [];
  }, [resolvedViewId, selectedFiltersByView]);

  const activeGroup = useMemo(() => {
    if (!resolvedViewId) return null;
    const saved = activeGroupByView[String(resolvedViewId)];
    return saved ? { name: saved, categories: [] } : null;
  }, [activeGroupByView, resolvedViewId]);

  const appliedFilterCount = selectedFilters.length;

  const setCurrentView = useCallback((nextViewId: string | number) => {
    setViewId(nextViewId);
    setPage(1);
    setSort(null);
  }, []);

  const setActiveGroup = (groupName: string) => {
    if (!resolvedViewId) return;
    setActiveGroupByView(prev => ({ ...prev, [String(resolvedViewId)]: groupName }));
  };

  const toggleFilter = (category: string, value: string, isSelected: boolean) => {
    if (!resolvedViewId) return;
    const key = String(resolvedViewId);
    setSelectedFiltersByView(prev => {
      const current = prev[key] ?? [];
      const next = isSelected
        ? [...current, { category, value }]
        : current.filter(filter => !(filter.category === category && filter.value === value));
      return { ...prev, [key]: next };
    });
    setPage(1);
  };

  const toggleSort = (category: string) => {
    setSort(prev => {
      if (!prev || prev.category !== category) return { category, order: 'asc' };
      if (prev.order === 'asc') return { category, order: 'desc' };
      return null;
    });
    setPage(1);
  };

  const setSearchQuery = useCallback((value: string) => {
    setSearchQueryState(value);
    setPage(1);
  }, []);

  const clearAllFilters = () => {
    setSelectedFiltersByView({});
    setFacetPagingByView({});
    setFacetOperatorsByView({});
    setPage(1);
    setSort(null);
  };

  const clearActiveFilters = useCallback(() => {
    setSearchQueryState('');
    setDebouncedSearchQuery('');
    setSelectedFiltersByView({});
    setFacetPagingByView({});
    setFacetOperatorsByView({});
    setPage(1);
    setSort(null);
  }, []);

  const facetPaging = useMemo(() => {
    if (!resolvedViewId) return {};
    return facetPagingByView[String(resolvedViewId)] ?? {};
  }, [resolvedViewId, facetPagingByView]);

  const facetOperators = useMemo(() => {
    if (!resolvedViewId) return {};
    return facetOperatorsByView[String(resolvedViewId)] ?? {};
  }, [resolvedViewId, facetOperatorsByView]);

  const setFacetSearch = (facetId: string, search: string) => {
    if (!resolvedViewId) return;
    const key = String(resolvedViewId);
    setFacetPagingByView(prev => {
      const current = prev[key] ?? {};
      const currentFacet = current[facetId] ?? {};
      return {
        ...prev,
        [key]: {
          ...current,
          [facetId]: { ...currentFacet, search, offset: 0 },
        },
      };
    });
  };

  const loadMoreFacet = (facetId: string, totalOptions: number) => {
    if (!resolvedViewId) return;
    const key = String(resolvedViewId);
    setFacetPagingByView(prev => {
      const current = prev[key] ?? {};
      const currentFacet = current[facetId] ?? {};
      return {
        ...prev,
        [key]: {
          ...current,
          [facetId]: {
            ...currentFacet,
            offset: 0,
            limit: Math.max(1, totalOptions),
          },
        },
      };
    });
  };

  const toggleFacetExpanded = (facetId: string) => {
    if (!resolvedViewId) return;
    const key = String(resolvedViewId);
    setExpandedFacetsByView(prev => {
      const current = prev[key] ?? {};
      return {
        ...prev,
        [key]: { ...current, [facetId]: !current[facetId] },
      };
    });
  };

  const isFacetExpanded = (facetId: string) => {
    if (!resolvedViewId) return false;
    const key = String(resolvedViewId);
    return expandedFacetsByView[key]?.[facetId] ?? false;
  };

  const hasFacetExpansionState = useMemo(() => {
    if (!resolvedViewId) return false;
    const key = String(resolvedViewId);
    const viewFacetState = expandedFacetsByView[key];
    return Boolean(viewFacetState && Object.keys(viewFacetState).length > 0);
  }, [resolvedViewId, expandedFacetsByView]);

  const setFacetOperator = (facetId: string, operator: FacetOperator) => {
    if (!resolvedViewId) return;
    const key = String(resolvedViewId);
    setFacetOperatorsByView(prev => {
      const current = prev[key] ?? {};
      return {
        ...prev,
        [key]: {
          ...current,
          [facetId]: operator,
        },
      };
    });
    setPage(1);
  };

  return {
    viewId: resolvedViewId,
    selectedFilters,
    activeGroup,
    appliedFilterCount,
    page,
    perPage,
    sort,
    searchQuery,
    activeSearchQuery,
    isGlobalSearchActive: Boolean(activeSearchQuery),
    setCurrentView,
    setActiveGroup,
    toggleFilter,
    setPage,
    setPerPage,
    toggleSort,
    setSearchQuery,
    clearAllFilters,
    clearActiveFilters,
    facetPaging,
    facetOperators,
    setFacetSearch,
    loadMoreFacet,
    toggleFacetExpanded,
    isFacetExpanded,
    hasFacetExpansionState,
    setFacetOperator,
  };
};
