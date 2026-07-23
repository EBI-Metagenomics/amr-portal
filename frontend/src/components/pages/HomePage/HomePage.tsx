import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { amrService } from '@services/amr/amrService';
import FacetSidebar from '@components/features/amr/FacetSidebar/FacetSidebar';
import DataPanel from '@components/features/amr/DataPanel/DataPanel';

const GeneViewerPanel = lazy(
  () => import('@components/features/amr/GeneViewerPanel/GeneViewerPanel')
);
import { useAmrPortalState } from '@/hooks/useAmrPortalState';
import {
  AMR_VIEW_ID_PHENOTYPE,
  buildGenomeViewerRowContext,
} from '@utils/genomeViewer/recordContext';
import { pickSearchResultView } from '@utils/search/pickSearchResultView';
import { isGenomeViewerEnabled } from '@/config/appEnv';
import type { AMRRecord } from '@interfaces/amrRecord';
import styles from './HomePage.module.css';

const HomePage = () => {
  const genomeViewerFeatureEnabled = useMemo(() => isGenomeViewerEnabled(), []);
  const [isGeneViewerCollapsed, setIsGeneViewerCollapsed] = useState(true);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const state = useAmrPortalState();
  const {
    viewId,
    hasViewInUrl,
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
  const hasResolvedLandingViewRef = useRef(hasViewInUrl);
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

  // Facet headers use the current table result count (search + filters), not search-only totals.
  const scopeTotal = recordsQuery.data?.meta.total_hits ?? null;

  useEffect(() => {
    if (numericViewId !== null && numericStateViewId === null && resolvedViewId !== null) {
      if (!hasViewInUrl && isGlobalSearchActive) {
        return;
      }
      setCurrentView(resolvedViewId);
    }
  }, [
    hasViewInUrl,
    isGlobalSearchActive,
    numericViewId,
    numericStateViewId,
    resolvedViewId,
    setCurrentView,
  ]);

  useEffect(() => {
    setSelectedRowIndex(null);
  }, [selectedFilters, page, perPage, sort, numericViewId, activeSearchQuery]);

  // Landing-page search arrives as `/data/?q=...` with no view. Pick a tab once
  // from facet search counts; never re-run when the user searches from the sidebar.
  useEffect(() => {
    if (hasResolvedLandingViewRef.current) return;
    if (hasViewInUrl) return;
    if (!isGlobalSearchActive) return;
    if (facetsQuery.isPlaceholderData || !facetsQuery.data) return;

    hasResolvedLandingViewRef.current = true;
    const nextView = pickSearchResultView(facetsQuery.data.data_type);
    if (numericStateViewId !== nextView) {
      setCurrentView(nextView);
    }
  }, [
    facetsQuery.data,
    facetsQuery.isPlaceholderData,
    hasViewInUrl,
    isGlobalSearchActive,
    numericStateViewId,
    setCurrentView,
  ]);

  // Genome browser on genotype + combined tabs only (not phenotype / experiments).
  const genomeViewerEnabled =
    genomeViewerFeatureEnabled && numericViewId !== null && numericViewId !== AMR_VIEW_ID_PHENOTYPE;

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

  // Hide the top strip until the user opens the browser; same full-height layout as phenotypes.
  const genomeViewerOpen = genomeViewerEnabled && !isGeneViewerCollapsed;

  const contentLayoutClass = useMemo(() => {
    if (!genomeViewerOpen) return styles.contentLayoutGeneViewerDisabled;
    return styles.contentLayoutGeneViewerExpanded;
  }, [genomeViewerOpen]);

  return (
    <div className={styles.root}>
      {numericViewId !== null ? (
        <>
          {genomeViewerOpen ? (
            <Suspense fallback={null}>
              <GeneViewerPanel
                isCollapsed={false}
                onToggleCollapsed={() => setIsGeneViewerCollapsed(true)}
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
