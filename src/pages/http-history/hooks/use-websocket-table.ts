import { useMemo } from 'react';
import { useWebSocketQuery } from './use-websocket-query';

export interface WebSocketConnectionSummary {
  id: string;
  url: string;
  host: string;
  path: string;
  state: 'open' | 'closed';
  messageCount: number;
  lastActivityAt: string;
}

const EMPTY_CONNECTIONS: WebSocketConnectionSummary[] = [];

export function useWebSocketTable() {
  const { query } = useWebSocketQuery();

  const connections = useMemo(() => EMPTY_CONNECTIONS, []);

  return {
    connections,
    isLoading: false,
    loadError: null as string | null,
    hasActiveFilters: Boolean(query.search || (query.scope && query.scope.length > 0)),
  };
}
