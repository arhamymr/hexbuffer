import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ProxyLogSummary, ProxyRecord, ApiCall } from '@/types';

import { fetchHistorySummaries } from '../services/history-service';
import { useHistoryQuery } from './use-history-query';

function buildUrlParts(uri: string) {
  let urlObj: URL | null = null;
  if (uri.includes('://')) {
    try {
      urlObj = new URL(uri);
    } catch (error) {
      console.warn('Failed to parse proxy record URL:', uri, error);
    }
  }

  const fallbackHost = uri.split('://').pop()?.split('/')[0] || '';
  const fallbackPath = (() => {
    const pathStart = uri.indexOf('/', uri.indexOf('://') + 3);
    if (pathStart === -1) return '/';
    return uri.slice(pathStart) || '/';
  })();

  return {
    urlObj,
    fallbackHost,
    fallbackPath,
  };
}

export function adaptProxySummaryToApiCall(record: ProxyLogSummary): ApiCall {
  const { urlObj, fallbackHost, fallbackPath } = buildUrlParts(record.url);

  return {
    id: record.id,
    session_id: '',
    target_id: '',
    timestamp: new Date(record.timestamp).getTime(),
    request_type: 'Other',
    method: record.method,
    url: record.url,
    host: urlObj?.host || fallbackHost,
    path: urlObj?.pathname || fallbackPath,
    query_params: {},
    headers: {},
    cookies: {},
    request_body: null,
    request_body_size: record.request_body_size,
    response_status: record.response_status,
    response_status_text: record.response_status_text,
    response_headers: {},
    response_cookies: {},
    response_body: null,
    response_body_size: record.response_body_size,
    response_content_type: record.response_content_type,
    security_state: '',
    server_ip: record.server_addr || null,
    duration_ms: null,
  };
}

export function adaptProxyRecordToApiCall(record: ProxyRecord): ApiCall {
  const { urlObj, fallbackHost, fallbackPath } = buildUrlParts(record.request.uri);

  return {
    id: record.id,
    session_id: '',
    target_id: '',
    timestamp: new Date(record.timestamp).getTime(),
    request_type: 'Other',
    method: record.request.method,
    url: record.request.uri,
    host: urlObj?.host || fallbackHost,
    path: urlObj?.pathname || fallbackPath,
    query_params: {},
    headers: record.request.headers,
    cookies: {},
    request_body: new TextDecoder().decode(new Uint8Array(record.request.body)),
    request_body_size: record.request.body.length,
    response_status: record.response?.status_code ?? null,
    response_status_text: record.response?.status_text || null,
    response_headers: record.response?.headers || {},
    response_cookies: {},
    response_body: record.response ? new TextDecoder().decode(new Uint8Array(record.response.body)) : null,
    response_body_size: record.response?.body.length ?? 0,
    response_content_type: record.response?.headers['content-type'] || null,
    content_decoded: record.request.content_decoded || record.response?.content_decoded,
    security_state: '',
    server_ip: record.server_addr || null,
    duration_ms: null,
  };
}

export function useHistoryTable() {
  const {
    query,
    hasActiveFilters,
    refreshKey,
    sortOrder,
    page,
    selectedCallId,
    setPage,
    setSortOrder,
    setSelectedCallId,
  } = useHistoryQuery();

  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [pagination, setPagination] = useState({ page: 1, perPage: 100, total: 0, hasMore: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newEventsCount, setNewEventsCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEventRef = useRef(false);
  const lastBaseQueryRef = useRef<string>('');
  const currentPageRef = useRef(page);

  useEffect(() => {
    currentPageRef.current = page;
  }, [page]);

  const baseQueryKey = useMemo(
    () =>
      JSON.stringify({
        filter: query.filter,
        sortOrder: query.sortOrder,
        perPage: query.perPage,
        refreshKey,
      }),
    [query, refreshKey]
  );

  const fetchPage = useCallback(
    async (pageToLoad: number) => {
      const shouldAppend = pageToLoad > 1;

      setIsLoading(pageToLoad === 1);
      setIsLoadingMore(pageToLoad > 1);

      try {
        setLoadError(null);
        const result = await fetchHistorySummaries({
          ...query,
          page: pageToLoad,
        });

        setPagination({
          page: pageToLoad,
          perPage: query.perPage,
          total: result.total,
          hasMore: result.has_more,
        });

        const adapted = result.data.map(adaptProxySummaryToApiCall);
        setCalls((prev) => (shouldAppend ? [...prev, ...adapted] : adapted));
      } catch (error) {
        console.error('Failed to fetch logs:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load HTTP history.');
        if (!shouldAppend) {
          setCalls([]);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [query]
  );

  useEffect(() => {
    if (lastBaseQueryRef.current !== baseQueryKey && page !== 1) {
      lastBaseQueryRef.current = baseQueryKey;
      setPage(1);
      return;
    }

    lastBaseQueryRef.current = baseQueryKey;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPage(page);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [baseQueryKey, page, fetchPage, setPage]);

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

    const unlistenPromise = listen<ProxyRecord>('proxy-record', handleEvent);

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!pagination.hasMore || isLoadingMore) {
      return;
    }

    setPage(page + 1);
  }, [pagination.hasMore, isLoadingMore, page, setPage]);

  const handleRefresh = useCallback(() => {
    setNewEventsCount(0);
    setPage(1);
    fetchPage(1);
  }, [fetchPage, setPage]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  }, [setSortOrder, sortOrder]);

  const removeCallLocally = useCallback(
    (id: string) => {
      setCalls((prev) => prev.filter((call) => call.id !== id));
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
      if (selectedCallId === id) {
        setSelectedCallId(null);
      }
    },
    [selectedCallId, setSelectedCallId]
  );

  return {
    calls,
    pagination,
    isLoading,
    isLoadingMore,
    newEventsCount,
    loadError,
    sortOrder,
    hasActiveFilters,
    hasScopedTab: Boolean(query.filter.scope && query.filter.scope.length > 0),
    loadMore,
    handleRefresh,
    toggleSortOrder,
    setSelectedCallId,
    removeCallLocally,
    selectedCallId,
  };
}
