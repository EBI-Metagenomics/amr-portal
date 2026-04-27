import { useEffect, useMemo, useState } from 'react';
import type { FiltersConfig, FiltersView } from '@interfaces/filtersConfig';
import type { SelectedFilter } from '@interfaces/amrApi';

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

  useEffect(() => {
    if (!filtersConfig || viewId !== null) return;
    const fromUrl = new URL(window.location.href).searchParams.get('view');
    const matched = fromUrl
      ? filtersConfig.filterViews.find(view => view.url_name === fromUrl)
      : null;
    const next = matched ?? filtersConfig.filterViews[0];
    setViewId(next?.id ?? null);
  }, [filtersConfig, viewId]);

  const currentView = useMemo(
    () => filtersConfig?.filterViews.find(view => view.id === viewId) ?? null,
    [filtersConfig, viewId]
  );

  useEffect(() => {
    if (!currentView) return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', currentView.url_name);
    window.history.replaceState(null, '', url);
  }, [currentView]);

  const selectedFilters = useMemo(() => {
    if (!viewId) return [];
    return selectedFiltersByView[String(viewId)] ?? [];
  }, [viewId, selectedFiltersByView]);

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
    if (!viewId) return;
    setActiveGroupByView(prev => ({ ...prev, [String(viewId)]: groupName }));
  };

  const toggleFilter = (category: string, value: string, isSelected: boolean) => {
    if (!viewId) return;
    const key = String(viewId);
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
    setPage(1);
    setSort(null);
  };

  return {
    viewId,
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
  };
};
