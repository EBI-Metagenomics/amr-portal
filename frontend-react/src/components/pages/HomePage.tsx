import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { amrService } from '@services/amr/amrService';
import TopPanel from '@components/features/TopPanel';
import BottomPanel from '@components/features/BottomPanel';
import { useAmrPortalState } from '@/hooks/useAmrPortalState';

const HomePage = () => {
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
        orderBy: state.sort
          ? { category: state.sort.category, order: state.sort.order.toUpperCase() as 'ASC' | 'DESC' }
          : undefined,
      }),
    enabled: Boolean(state.currentView?.id) && state.selectedFilters.length > 0,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="page-container">
      {filtersConfigQuery.data && state.currentView ? (
        <>
          <TopPanel
            filtersConfig={filtersConfigQuery.data}
            selectedFilters={state.selectedFilters}
            currentViewId={state.currentView.id}
            activeGroupName={state.activeGroup?.name ?? null}
            appliedFilterCount={state.appliedFilterCount}
            onViewChange={state.setCurrentView}
            onGroupChange={state.setActiveGroup}
            onFilterToggle={state.toggleFilter}
          />
          <BottomPanel
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
        </>
      ) : <p>Loading...</p>}
    </div>
  );
};

export default HomePage;
