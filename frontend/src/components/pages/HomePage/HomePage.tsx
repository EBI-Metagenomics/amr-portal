import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { amrService } from '@services/amr/amrService';
import FacetSidebar from '@components/features/amr/FacetSidebar/FacetSidebar';
import { getActiveScopeTotal } from '@components/features/amr/FacetSidebar/facetHeaderSummary';
import DataPanel from '@components/features/amr/DataPanel/DataPanel';

const GeneViewerPanel = lazy(
  () => import('@components/features/amr/GeneViewerPanel/GeneViewerPanel')
);
import { useAmrPortalState } from '@/hooks/useAmrPortalState';
import { buildGenomeViewerRowContext } from '@utils/genomeViewer/recordContext';
import { isGenomeViewerEnabled } from '@/config/appEnv';
import type { AMRRecord } from '@interfaces/amrRecord';
import styles from './HomePage.module.css';

const HomePage = () => {
  const genomeViewerEnabled = useMemo(() => isGenomeViewerEnabled(), []);
  const [isGeneViewerCollapsed, setIsGeneViewerCollapsed] = useState(true);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const lastAutoRedirectSearchRef = useRef<string | null>(null);
  const state = useAmrPortalState();
  const {
    viewId,
    selectedFilters,
    facetOperators,
    page,
    perPage,
    sort,
    facetPaging,
    setCurrentView,
    toggleFilter,
    clearAllFilters,
    clearActiveFilters,
    setFacetSearch,
    loadMoreFacet,
    toggleFacetExpanded,
    isFacetExpanded,
    hasFacetExpansionState,
    setFacetOperator,
    setPage,
    setPerPage,
    toggleSort,
    searchQuery,
    activeSearchQuery,
    isGlobalSearchActive,
    setSearchQuery,
    submitSearch,
    clearSearch,
  } = state;
  const numericStateViewId =
    typeof viewId === 'number'
      ? viewId
      : viewId !== null && /^\d+$/.test(String(viewId))
        ? Number(viewId)
        : null;

  const facetsQuery = useQuery({
    queryKey: [
      'amr-facets',
      numericStateViewId,
      selectedFilters,
      facetPaging,
      facetOperators,
      activeSearchQuery,
    ],
    queryFn: () =>
      amrService.getAMRFacets({
        filters: selectedFilters,
        viewId: numericStateViewId ?? undefined,
        facetPaging,
        facetOperators,
        searchQuery: activeSearchQuery,
      }),
    placeholderData: keepPreviousData,
  });

  const resolvedViewId =
    numericStateViewId ??
    facetsQuery.data?.data_type.find(type => type.active)?.id ??
    facetsQuery.data?.data_type[0]?.id ??
    null;
  const numericViewId =
    typeof resolvedViewId === 'number'
      ? resolvedViewId
      : resolvedViewId !== null && /^\d+$/.test(String(resolvedViewId))
        ? Number(resolvedViewId)
        : null;

  const recordsQuery = useQuery({
    queryKey: [
      'amr-records',
      numericViewId,
      selectedFilters,
      facetOperators,
      page,
      perPage,
      sort,
      activeSearchQuery,
    ],
    queryFn: () =>
      amrService.getAMRRecords({
        filters: selectedFilters,
        viewId: numericViewId!,
        page,
        perPage,
        facetOperators,
        searchQuery: activeSearchQuery,
        orderBy: sort
          ? { category: sort.category, order: sort.order.toUpperCase() as 'ASC' | 'DESC' }
          : undefined,
      }),
    enabled: numericViewId !== null,
    placeholderData: keepPreviousData,
  });

  const scopeTotal = useMemo(() => {
    if (isGlobalSearchActive) {
      return getActiveScopeTotal(facetsQuery.data?.data_type ?? [], numericViewId ?? 1, true);
    }
    return recordsQuery.data?.meta.total_hits ?? null;
  }, [
    isGlobalSearchActive,
    facetsQuery.data?.data_type,
    numericViewId,
    recordsQuery.data?.meta.total_hits,
  ]);

  useEffect(() => {
    if (numericViewId !== null && numericStateViewId === null && resolvedViewId !== null) {
      setCurrentView(resolvedViewId);
    }
  }, [numericViewId, numericStateViewId, resolvedViewId, setCurrentView]);

  useEffect(() => {
    setSelectedRowIndex(null);
  }, [selectedFilters, page, perPage, sort, numericViewId, activeSearchQuery]);

  // Landing page always redirects searches to `view=combined`.
  // If the combined tab has zero hits but one of the other tabs has hits,
  // automatically switch to the tab that has matches.
  useEffect(() => {
    if (!isGlobalSearchActive) return;
    if (numericStateViewId !== 3) return; // combined
    if (recordsQuery.isPlaceholderData) return;
    if (facetsQuery.isPlaceholderData) return;

    const totalHits = recordsQuery.data?.meta.total_hits;
    if (totalHits !== 0) return;

    const search = activeSearchQuery?.trim();
    if (!search) return;
    if (lastAutoRedirectSearchRef.current === search) return;

    const dataTypes = facetsQuery.data?.data_type ?? [];
    const experimentsHits = dataTypes.find(type => type.id === 1)?.search_count ?? 0;
    const predictionsHits = dataTypes.find(type => type.id === 2)?.search_count ?? 0;

    if (experimentsHits > 0) {
      lastAutoRedirectSearchRef.current = search;
      setCurrentView(1);
      return;
    }
    if (predictionsHits > 0) {
      lastAutoRedirectSearchRef.current = search;
      setCurrentView(2);
    }
  }, [
    activeSearchQuery,
    facetsQuery.data?.data_type,
    facetsQuery.isPlaceholderData,
    isGlobalSearchActive,
    numericStateViewId,
    recordsQuery.data?.meta.total_hits,
    recordsQuery.isPlaceholderData,
    setCurrentView,
  ]);

  useEffect(() => {
    if (selectedRowIndex === null) {
      setIsGeneViewerCollapsed(true);
    }
  }, [selectedRowIndex]);

  const { genomeRowContext, hasSelectedTableRow } = useMemo(() => {
    if (selectedRowIndex === null || !recordsQuery.data || numericViewId === null) {
      return { genomeRowContext: null, hasSelectedTableRow: false };
    }
    const record = recordsQuery.data.data[selectedRowIndex];
    if (!record) {
      return { genomeRowContext: null, hasSelectedTableRow: false };
    }
    return {
      genomeRowContext: buildGenomeViewerRowContext(record, recordsQuery.data.meta.columns, numericViewId),
      hasSelectedTableRow: true,
    };
  }, [selectedRowIndex, recordsQuery.data, numericViewId]);

  const handleRowSelect = useCallback((rowIndex: number, record: AMRRecord) => {
    setSelectedRowIndex(rowIndex);
    void record; // record isn't needed here, but keep signature stable for DataPanel
    if (genomeViewerEnabled) {
      setIsGeneViewerCollapsed(false);
    }
  }, [genomeViewerEnabled]);

  const loadJbrowseData =
    genomeViewerEnabled && !isGeneViewerCollapsed && hasSelectedTableRow && genomeRowContext !== null;

  const contentLayoutClass = useMemo(() => {
    if (!genomeViewerEnabled) return styles.contentLayoutGeneViewerDisabled;
    return isGeneViewerCollapsed
      ? styles.contentLayoutGeneViewerCollapsed
      : styles.contentLayoutGeneViewerExpanded;
  }, [genomeViewerEnabled, isGeneViewerCollapsed]);

  return (
    <div className={styles.root}>
      {numericViewId !== null ? (
        <>
          {genomeViewerEnabled ? (
            <Suspense fallback={null}>
              <GeneViewerPanel
                isCollapsed={isGeneViewerCollapsed}
                onToggleCollapsed={() => setIsGeneViewerCollapsed(prev => !prev)}
                rowContext={genomeRowContext}
                hasSelectedTableRow={hasSelectedTableRow}
                loadData={loadJbrowseData}
              />
            </Suspense>
          ) : null}
          <div className={[styles.contentLayout, contentLayoutClass].filter(Boolean).join(' ')}>
            <aside className={styles.leftFacetPanel}>
              <FacetSidebar
                facetsData={facetsQuery.data}
                selectedFilters={selectedFilters}
                currentViewId={numericViewId}
                searchQuery={searchQuery}
                activeSearchQuery={activeSearchQuery}
                isGlobalSearchActive={isGlobalSearchActive}
                onSearchQueryChange={setSearchQuery}
                onSearchSubmit={submitSearch}
                onClearSearch={clearSearch}
                onClearActiveFilters={clearActiveFilters}
                onViewChange={setCurrentView}
                onFilterToggle={toggleFilter}
                onClearAllFilters={clearAllFilters}
                onFacetSearch={setFacetSearch}
                onFacetLoadMore={loadMoreFacet}
                onFacetToggleExpand={toggleFacetExpanded}
                isFacetExpanded={isFacetExpanded}
                hasFacetExpansionState={hasFacetExpansionState}
                facetOperators={facetOperators}
                onFacetOperatorChange={setFacetOperator}
                scopeTotal={scopeTotal}
              />
            </aside>
            <div className={styles.resultsPanel}>
              <DataPanel
                currentViewId={numericViewId}
                selectedFilters={selectedFilters}
                data={recordsQuery.data}
                isFetching={recordsQuery.isFetching}
                isPlaceholderData={recordsQuery.isPlaceholderData}
                isLoading={recordsQuery.isLoading}
                isError={recordsQuery.isError}
                activeSearchQuery={activeSearchQuery}
                page={page}
                perPage={perPage}
                sort={sort}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
                onSortChange={toggleSort}
                onClearFilters={clearAllFilters}
                selectedRowIndex={selectedRowIndex}
                onRowSelect={genomeViewerEnabled ? handleRowSelect : undefined}
                genomeViewerEnabled={genomeViewerEnabled}
              />
            </div>
          </div>
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default HomePage;
