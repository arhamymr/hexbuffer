import { useMemo } from 'react';
import { useHistoryQuery } from './use-history-query';

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
  const { filter, activeScope, page, perPage } = useHistoryQuery();

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
