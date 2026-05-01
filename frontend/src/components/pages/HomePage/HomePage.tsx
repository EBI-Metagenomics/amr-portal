import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { amrService } from '@services/amr/amrService';
import FacetSidebar from '@components/features/amr/FacetSidebar/FacetSidebar';
import GeneViewerPanel from '@components/features/amr/GeneViewerPanel/GeneViewerPanel';
import DataPanel from '@components/features/amr/DataPanel/DataPanel';
import { useAmrPortalState } from '@/hooks/useAmrPortalState';
import styles from './HomePage.module.css';

const HomePage = () => {
  const [isGeneViewerCollapsed, setIsGeneViewerCollapsed] = useState(true);
  const filtersConfigQuery = useQuery({
    queryKey: ['filters-config'],
    queryFn: () => amrService.getFiltersConfig(),
  });

  const state = useAmrPortalState(filtersConfigQuery.data);

  const recordsQuery = useQuery({
    queryKey: [
      'amr-records',
      state.currentView?.id,
      state.selectedFilters,
      state.facetOperators,
      state.page,
      state.perPage,
      state.sort,
    ],
    queryFn: () =>
      amrService.getAMRRecords({
        filters: state.selectedFilters,
        viewId: state.currentView!.id,
        page: state.page,
        perPage: state.perPage,
        facetOperators: state.facetOperators,
        orderBy: state.sort
          ? { category: state.sort.category, order: state.sort.order.toUpperCase() as 'ASC' | 'DESC' }
          : undefined,
      }),
    enabled: Boolean(state.currentView?.id) && state.selectedFilters.length > 0,
    placeholderData: keepPreviousData,
  });

  const facetsQuery = useQuery({
    queryKey: [
      'amr-facets',
      state.currentView?.id,
      state.selectedFilters,
      state.facetPaging,
      state.facetOperators,
    ],
    queryFn: () =>
      amrService.getAMRFacets({
        filters: state.selectedFilters,
        viewId: state.currentView!.id,
        facetPaging: state.facetPaging,
        facetOperators: state.facetOperators,
      }),
    enabled: Boolean(state.currentView?.id),
    placeholderData: keepPreviousData,
  });

  return (
    <div className={styles.root}>
      {filtersConfigQuery.data && state.currentView ? (
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
                filtersConfig={filtersConfigQuery.data}
                facetsData={facetsQuery.data}
                selectedFilters={state.selectedFilters}
                currentViewId={state.currentView.id}
                onViewChange={state.setCurrentView}
                onFilterToggle={state.toggleFilter}
                onClearAllFilters={state.clearAllFilters}
                onFacetSearch={state.setFacetSearch}
                onFacetLoadMore={state.loadMoreFacet}
                onFacetToggleExpand={state.toggleFacetExpanded}
                isFacetExpanded={state.isFacetExpanded}
                hasFacetExpansionState={state.hasFacetExpansionState}
                facetOperators={state.facetOperators}
                onFacetOperatorChange={state.setFacetOperator}
              />
            </aside>
            <div className={styles.resultsPanel}>
              <DataPanel
                currentView={state.currentView}
                selectedFilters={state.selectedFilters}
                data={recordsQuery.data}
                isFetching={recordsQuery.isFetching}
                isPlaceholderData={recordsQuery.isPlaceholderData}
                isLoading={recordsQuery.isLoading}
                isError={recordsQuery.isError}
                hasSelectedFilters={state.selectedFilters.length > 0}
                page={state.page}
                perPage={state.perPage}
                sort={state.sort}
                onPageChange={state.setPage}
                onPerPageChange={state.setPerPage}
                onSortChange={state.toggleSort}
                onClearFilters={state.clearAllFilters}
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
