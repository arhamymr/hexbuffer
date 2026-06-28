import { useMemo } from 'react';
import { useWebSocketHistoryQueryStore } from '../state/query-store';
import { useShallow } from 'zustand/react/shallow';

export interface WebSocketHistoryQuery {
  page: number;
  perPage: number;
  filter: {
    search: string | null;
    scope: string[] | null;
    states: string[] | null;
  };
}

export function useWebSocketQuery() {
  const { filter, activeScope, page, perPage } = useWebSocketHistoryQueryStore(
    useShallow((state) => ({
      filter: state.filter,
      activeScope: state.activeScope,
      page: state.page,
      perPage: state.perPage,
    }))
  );

  const query = useMemo<WebSocketHistoryQuery>(
    () => ({
      page,
      perPage,
      filter: {
        search: filter.search?.trim() ? filter.search.trim() : null,
        scope: activeScope && activeScope.length > 0 ? activeScope : null,
        states: null,
      },
    }),
    [filter.search, activeScope, page, perPage]
  );

  return {
    filter,
    activeScope,
    page,
    perPage,
    query,
  };
}
