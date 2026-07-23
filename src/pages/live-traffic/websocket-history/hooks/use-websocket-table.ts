import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { WebSocketConnectionSummary as WebSocketConnectionSummaryDto } from '../api';

import { fetchWebSocketSummaries } from '../services/history-service';
import { useWebSocketQuery } from './use-websocket-query';
import { useWebSocketHistoryQueryStore } from '@/stores/history';
import { useShallow } from 'zustand/react/shallow';

export interface WebSocketConnectionSummary {
  id: string;
  timestamp: string;
  url: string;
  host: string;
  path: string;
  direction: string;
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
    direction: record.direction,
    state: record.state,
    messageCount: record.message_count,
    lastActivityAt: record.last_activity_at,
  };
}

export function useWebSocketTable() {
  const { query } = useWebSocketQuery();
  const { isStreamManuallyPaused, refreshKey, setPage } = useWebSocketHistoryQueryStore(
    useShallow((state) => ({
      isStreamManuallyPaused: state.isStreamManuallyPaused,
      refreshKey: state.refreshKey,
      setPage: state.setPage,
    }))
  );

  const [connections, setConnections] = useState<WebSocketConnectionSummary[]>([]);
  const [pagination, setPagination] = useState({ page: 1, perPage: 60, total: 0, hasMore: false });
  const [isLoading, setIsLoading] = useState(true);
  const [newEventsCount, setNewEventsCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEventsCountRef = useRef(0);
  const isStreamPausedRef = useRef(isStreamManuallyPaused);
  const lastBaseQueryRef = useRef<string>('');
  const currentPageRef = useRef(1);

  useEffect(() => {
    currentPageRef.current = query.page;
  }, [query.page]);

  useEffect(() => {
    isStreamPausedRef.current = isStreamManuallyPaused;
    if (!isStreamManuallyPaused) {
      setNewEventsCount(0);
    }
  }, [isStreamManuallyPaused]);

  const baseQueryKey = useMemo(
    () =>
      JSON.stringify({
        filter: query.filter,
        perPage: query.perPage,
        refreshKey,
      }),
    [query.filter, query.perPage, refreshKey]
  );

  const fetchPage = useCallback(
    async (pageToLoad: number) => {
      setIsLoading(true);

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
        setConnections(adapted);
      } catch (error) {
        console.error('Failed to fetch WebSocket history:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load WebSocket history.');
        setConnections([]);
      } finally {
        setIsLoading(false);
      }
    },
    [query]
  );

  useEffect(() => {
    if (lastBaseQueryRef.current !== baseQueryKey && query.page !== 1) {
      lastBaseQueryRef.current = baseQueryKey;
      setPage(1);
      return;
    }

    lastBaseQueryRef.current = baseQueryKey;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(() => {
      fetchPage(query.page);
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [baseQueryKey, fetchPage, query.page, setPage]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleEvent = () => {
      pendingEventsCountRef.current += 1;
      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(async () => {
        const count = pendingEventsCountRef.current;
        pendingEventsCountRef.current = 0;

        if (isStreamPausedRef.current || currentPageRef.current !== 1) {
          setNewEventsCount((prev) => prev + count);
        } else {
          await fetchPage(1);
        }
      }, 500);
    };

    const unlistenPromise = listen('websocket-connection', handleEvent);

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [fetchPage]);

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.perPage));
  const hasNextPage = query.page < totalPages;
  const hasPreviousPage = query.page > 1;

  const goToNextPage = useCallback(() => {
    if (hasNextPage) {
      setPage(query.page + 1);
    }
  }, [hasNextPage, query.page, setPage]);

  const goToPreviousPage = useCallback(() => {
    if (hasPreviousPage) {
      setPage(query.page - 1);
    }
  }, [hasPreviousPage, query.page, setPage]);

  const handleRefresh = useCallback(() => {
    setNewEventsCount(0);
    setPage(1);
    fetchPage(1);
  }, [fetchPage, setPage]);

  const removeConnectionLocally = useCallback((connectionId: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== connectionId));
  }, []);

  return {
    connections,
    pagination,
    isLoading,
    newEventsCount,
    loadError,
    searchQuery: query.filter.search || '',
    hasActiveFilters: Boolean(query.filter.search || (query.filter.scope && query.filter.scope.length > 0)),
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    handleRefresh,
    removeConnectionLocally,
  };
}
