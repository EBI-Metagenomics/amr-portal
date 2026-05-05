import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { amrService } from '@services/amr/amrService';
import FacetSidebar from '@components/features/amr/FacetSidebar/FacetSidebar';
import GeneViewerPanel from '@components/features/amr/GeneViewerPanel/GeneViewerPanel';
import DataPanel from '@components/features/amr/DataPanel/DataPanel';
import { useAmrPortalState } from '@/hooks/useAmrPortalState';
import styles from './HomePage.module.css';

const HomePage = () => {
  const [isGeneViewerCollapsed, setIsGeneViewerCollapsed] = useState(true);
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
    setFacetSearch,
    loadMoreFacet,
    toggleFacetExpanded,
    isFacetExpanded,
    hasFacetExpansionState,
    setFacetOperator,
    setPage,
    setPerPage,
    toggleSort,
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
    ],
    queryFn: () =>
      amrService.getAMRFacets({
        filters: selectedFilters,
        viewId: numericStateViewId ?? undefined,
        facetPaging,
        facetOperators,
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
    ],
    queryFn: () =>
      amrService.getAMRRecords({
        filters: selectedFilters,
        viewId: numericViewId!,
        page,
        perPage,
        facetOperators,
        orderBy: sort
          ? { category: sort.category, order: sort.order.toUpperCase() as 'ASC' | 'DESC' }
          : undefined,
      }),
    enabled: numericViewId !== null && selectedFilters.length > 0,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (numericViewId !== null && numericStateViewId === null) {
      setCurrentView(resolvedViewId);
    }
  }, [numericViewId, numericStateViewId, resolvedViewId, setCurrentView]);

  return (
    <div className={styles.root}>
      {numericViewId !== null ? (
        <>
          <GeneViewerPanel
            isCollapsed={isGeneViewerCollapsed}
            onToggleCollapsed={() => setIsGeneViewerCollapsed(prev => !prev)}
          />
          {!isGeneViewerCollapsed ? <section className={styles.geneViewerExpandedFill} /> : null}
          <div
            className={[
              styles.contentLayout,
              isGeneViewerCollapsed
                ? styles.contentLayoutGeneViewerCollapsed
                : styles.contentLayoutGeneViewerExpanded,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <aside className={styles.leftFacetPanel}>
              <FacetSidebar
                facetsData={facetsQuery.data}
                selectedFilters={selectedFilters}
                currentViewId={numericViewId}
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
                hasSelectedFilters={selectedFilters.length > 0}
                page={page}
                perPage={perPage}
                sort={sort}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
                onSortChange={toggleSort}
                onClearFilters={clearAllFilters}
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
