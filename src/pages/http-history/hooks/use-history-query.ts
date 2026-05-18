import { useMemo } from 'react';

import { buildHistoryQuery, hasActiveHistoryFilters } from '../state/build-history-query';
import { useHistoryQueryStore } from '../state/history-query-store';

export function useHistoryQuery() {
  const filter = useHistoryQueryStore((state) => state.filter);
  const activeScope = useHistoryQueryStore((state) => state.activeScope);
  const sortOrder = useHistoryQueryStore((state) => state.sortOrder);
  const page = useHistoryQueryStore((state) => state.page);
  const perPage = useHistoryQueryStore((state) => state.perPage);
  const refreshKey = useHistoryQueryStore((state) => state.refreshKey);

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

  return {
    query,
    hasActiveFilters,
    refreshKey,
  };
}
