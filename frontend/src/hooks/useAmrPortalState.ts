import { useEffect, useMemo, useState } from 'react';
import type { FiltersConfig, FiltersView } from '@interfaces/filtersConfig';
import type { FacetOperator, FacetPageState, SelectedFilter } from '@interfaces/amrApi';

const DEFAULT_PER_PAGE = 100;

export type SortState = {
  category: string;
  order: 'asc' | 'desc';
} | null;

export const useAmrPortalState = (filtersConfig?: FiltersConfig) => {
  const [viewId, setViewId] = useState<FiltersView['id'] | null>(null);
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

  const initialViewId = useMemo(() => {
    if (!filtersConfig) return null;
    const fromUrl = new URL(window.location.href).searchParams.get('view');
    const matched = fromUrl
      ? filtersConfig.filterViews.find(view => view.url_name === fromUrl)
      : null;
    return matched?.id ?? filtersConfig.filterViews[0]?.id ?? null;
  }, [filtersConfig]);
  const resolvedViewId = viewId ?? initialViewId;

  const currentView = useMemo(
    () => filtersConfig?.filterViews.find(view => view.id === resolvedViewId) ?? null,
    [filtersConfig, resolvedViewId]
  );

  useEffect(() => {
    if (!currentView) return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', currentView.url_name);
    window.history.replaceState(null, '', url);
  }, [currentView]);

  const selectedFilters = useMemo(() => {
    if (!resolvedViewId) return [];
    return selectedFiltersByView[String(resolvedViewId)] ?? [];
  }, [resolvedViewId, selectedFiltersByView]);

  const activeGroupName = useMemo(() => {
    if (!currentView) return null;
    const saved = activeGroupByView[String(currentView.id)];
    return saved ?? currentView.categoryGroups[0]?.name ?? null;
  }, [activeGroupByView, currentView]);

  const activeGroup = useMemo(() => {
    if (!currentView || !activeGroupName) return null;
    return currentView.categoryGroups.find(group => group.name === activeGroupName) ?? null;
  }, [currentView, activeGroupName]);

  const appliedFilterCount = useMemo(() => {
    if (!currentView) return 0;
    const primaryIds = currentView.categoryGroups.flatMap(group => group.categories);
    return selectedFilters.filter(filter => primaryIds.includes(filter.category)).length;
  }, [currentView, selectedFilters]);

  const setCurrentView = (nextViewId: FiltersView['id']) => {
    setViewId(nextViewId);
    setPage(1);
    setSort(null);
  };

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

  const clearAllFilters = () => {
    setSelectedFiltersByView({});
    setFacetPagingByView({});
    setFacetOperatorsByView({});
    setPage(1);
    setSort(null);
  };

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

  const loadMoreFacet = (facetId: string, nextOffset: number) => {
    if (!resolvedViewId) return;
    const key = String(resolvedViewId);
    setFacetPagingByView(prev => {
      const current = prev[key] ?? {};
      const currentFacet = current[facetId] ?? {};
      return {
        ...prev,
        [key]: {
          ...current,
          [facetId]: { ...currentFacet, offset: nextOffset },
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
    currentView,
    selectedFilters,
    activeGroup,
    appliedFilterCount,
    page,
    perPage,
    sort,
    setCurrentView,
    setActiveGroup,
    toggleFilter,
    setPage,
    setPerPage,
    toggleSort,
    clearAllFilters,
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
