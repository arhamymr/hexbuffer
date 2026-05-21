import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { WebSocketConnectionSummary as WebSocketConnectionSummaryDto } from '@/pages/http-history/api';

import { fetchWebSocketSummaries } from '../services/history-service';
import { useWebSocketQuery } from './use-websocket-query';

export interface WebSocketConnectionSummary {
  id: string;
  timestamp: string;
  url: string;
  host: string;
  path: string;
  state: string;
  messageCount: number;
  lastActivityAt: string;
}

function adaptWebSocketSummary(record: WebSocketConnectionSummaryDto): WebSocketConnectionSummary {
  return {
    id: record.id,
    timestamp: record.timestamp,
    url: record.url,
    host: record.host,
    path: record.path,
    state: record.state,
    messageCount: record.message_count,
    lastActivityAt: record.last_activity_at,
  };
}

export function useWebSocketTable() {
  const { query } = useWebSocketQuery();
  const [connections, setConnections] = useState<WebSocketConnectionSummary[]>([]);
  const [pagination, setPagination] = useState({ page: 1, perPage: 100, total: 0, hasMore: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newEventsCount, setNewEventsCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEventRef = useRef(false);
  const lastBaseQueryRef = useRef<string>('');
  const currentPageRef = useRef(query.page);

  useEffect(() => {
    currentPageRef.current = query.page;
  }, [query.page]);

  const baseQueryKey = useMemo(
    () =>
      JSON.stringify({
        filter: query.filter,
        perPage: query.perPage,
      }),
    [query.filter, query.perPage]
  );

  const fetchPage = useCallback(
    async (pageToLoad: number) => {
      const shouldAppend = pageToLoad > 1;

      setIsLoading(pageToLoad === 1);
      setIsLoadingMore(pageToLoad > 1);

      try {
        setLoadError(null);
        const result = await fetchWebSocketSummaries({
          ...query,
          page: pageToLoad,
        });

        setPagination({
          page: pageToLoad,
          perPage: query.perPage,
          total: result.total,
          hasMore: result.has_more,
        });

        const adapted = result.data.map(adaptWebSocketSummary);
        setConnections((prev) => (shouldAppend ? [...prev, ...adapted] : adapted));
      } catch (error) {
        console.error('Failed to fetch WebSocket history:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load WebSocket history.');
        if (!shouldAppend) {
          setConnections([]);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [query]
  );

  useEffect(() => {
    if (lastBaseQueryRef.current !== baseQueryKey && query.page !== 1) {
      lastBaseQueryRef.current = baseQueryKey;
      fetchPage(1);
      return;
    }

    lastBaseQueryRef.current = baseQueryKey;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPage(query.page);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [baseQueryKey, fetchPage, query.page]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleEvent = () => {
      pendingEventRef.current = true;
      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(async () => {
        if (!pendingEventRef.current) return;
        pendingEventRef.current = false;

        if (currentPageRef.current === 1) {
          await fetchPage(1);
        } else {
          setNewEventsCount((count) => count + 1);
        }
      }, 500);
    };

    const unlistenPromise = listen('websocket-connection', handleEvent);

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!pagination.hasMore || isLoadingMore) {
      return;
    }

    fetchPage(pagination.page + 1);
  }, [fetchPage, isLoadingMore, pagination.hasMore, pagination.page]);

  const handleRefresh = useCallback(() => {
    setNewEventsCount(0);
    fetchPage(1);
  }, [fetchPage]);

  return {
    connections,
    pagination,
    isLoading,
    isLoadingMore,
    newEventsCount,
    loadError,
    hasActiveFilters: Boolean(query.filter.search || (query.filter.scope && query.filter.scope.length > 0)),
    loadMore,
    handleRefresh,
  };
}
