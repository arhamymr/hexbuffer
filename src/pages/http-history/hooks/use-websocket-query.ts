import { useMemo } from 'react';
import { useHistoryQuery } from './use-history-query';

export interface WebSocketHistoryQuery {
  search: string | null;
  scope: string[] | null;
  page: number;
  perPage: number;
}

export function useWebSocketQuery() {
  const { filter, activeScope, page, perPage } = useHistoryQuery();

  const query = useMemo<WebSocketHistoryQuery>(
    () => ({
      search: filter.search?.trim() ? filter.search.trim() : null,
      scope: activeScope && activeScope.length > 0 ? activeScope : null,
      page,
      perPage,
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
