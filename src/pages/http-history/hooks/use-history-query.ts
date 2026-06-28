import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { buildHistoryQuery, hasActiveHistoryFilters } from '../state/build-history-query';
import { useHttpHistoryQueryStore } from '../state/history-query-store';

export function useHistoryQuery() {
  const historyQueryState = useHttpHistoryQueryStore(
    useShallow((state) => ({
      filter: state.filter,
      activeScope: state.activeScope,
      sortOrder: state.sortOrder,
      page: state.page,
      perPage: state.perPage,
      selectedCallId: state.selectedCallId,
      isStreamManuallyPaused: state.isStreamManuallyPaused,
      refreshKey: state.refreshKey,
      setSearch: state.setSearch,
      setFilter: state.setFilter,
      setPathFilter: state.setPathFilter,
      setActiveScope: state.setActiveScope,
      toggleMethod: state.toggleMethod,
      toggleStatus: state.toggleStatus,
      clearFilters: state.clearFilters,
      setSortOrder: state.setSortOrder,
      setPage: state.setPage,
      resetPage: state.resetPage,
      setSelectedCallId: state.setSelectedCallId,
      setStreamManuallyPaused: state.setStreamManuallyPaused,
      triggerRefresh: state.triggerRefresh,
    }))
  );

  const {
    filter,
    activeScope,
    sortOrder,
    page,
    perPage,
    selectedCallId,
    isStreamManuallyPaused,
    refreshKey,
    setSearch,
    setFilter,
    setPathFilter,
    setActiveScope,
    toggleMethod,
    toggleStatus,
    clearFilters,
    setSortOrder,
    setPage,
    resetPage,
    setSelectedCallId,
    setStreamManuallyPaused,
    triggerRefresh,
  } = historyQueryState;

  const query = useMemo(
    () =>
      buildHistoryQuery({
        filter,
        activeScope,
        sortOrder,
        page,
        perPage,
      }),
    [filter, activeScope, sortOrder, page, perPage]
  );

  const hasActiveFilters = hasActiveHistoryFilters({ filter, activeScope });

  return useMemo(
    () => ({
      filter,
      activeScope,
      sortOrder,
      page,
      perPage,
      selectedCallId,
      isStreamManuallyPaused,
      refreshKey,
      query,
      hasActiveFilters,
      setSearch,
      setFilter,
      setPathFilter,
      setActiveScope,
      toggleMethod,
      toggleStatus,
      clearFilters,
      setSortOrder,
      setPage,
      resetPage,
      setSelectedCallId,
      setStreamManuallyPaused,
      triggerRefresh,
    }),
    [
      filter,
      activeScope,
      sortOrder,
      page,
      perPage,
      selectedCallId,
      isStreamManuallyPaused,
      refreshKey,
      query,
      hasActiveFilters,
      setSearch,
      setFilter,
      setPathFilter,
      setActiveScope,
      toggleMethod,
      toggleStatus,
      clearFilters,
      setSortOrder,
      setPage,
      resetPage,
      setSelectedCallId,
      setStreamManuallyPaused,
      triggerRefresh,
    ]
  );
}
