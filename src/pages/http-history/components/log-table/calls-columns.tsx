'use client';

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { formatTimestamp, formatBytes, getMethodBadge, StatusBadge, getExtension } from "./utils";
import { LogEntryContextMenu } from "./log-context-menu";
import { listen } from '@tauri-apps/api/event';
import { useEffect, useRef, useState, useCallback } from "react";
import type { ProxyRecord, ApiCall } from '@/types';
import { getHttpLogs, type ProxyFilter } from '@/pages/http-history/api';
import { filterStateToProxyFilter } from '@/stores/filter';
import { useFilterStore } from '@/stores/filter';
import { useLogStore } from '@/stores/log';
import { Button } from "@/components/ui/button";

interface TrafficTableProps {
  targetScope?: string[];
}

export const callsColumns: import("@tanstack/react-table").ColumnDef<ApiCall>[] = [
  {
    accessorKey: "timestamp",
    header: "Time",
    size: 90,
    cell: ({ row }) => (
      <span className="text-xs font-mono text-muted-foreground">
        {formatTimestamp(row.original.timestamp)}
      </span>
    ),
  },
  {
    accessorKey: "method",
    header: "Method",
    size: 70,
    cell: ({ row }) => (
      <div className="flex gap-2">
        {getMethodBadge(row.original.method)}
        <StatusBadge status={row.original.response_status} />
      </div>
    ),
  },
  {
    accessorKey: "host",
    header: "Host",
    size: 150,
  },
  {
    accessorKey: "path",
    header: "Path",
    size: 200,
  },
  {
    accessorKey: "response_body_size",
    header: "Size",
    size: 70,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground text-right block">
        {formatBytes(row.original.response_body_size)}
      </span>
    ),
  },
  {
    accessorKey: "duration_ms",
    header: "Duration",
    size: 80,
    cell: () => <span className="text-xs text-muted-foreground">-</span>,
  },
  {
    accessorKey: "request_body_size",
    header: "Length",
    size: 70,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground text-right block">
        {formatBytes(row.original.request_body_size)}
      </span>
    ),
  },
  {
    accessorKey: "response_content_type",
    header: "MIME Type",
    size: 150,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground truncate block">
        {row.original.response_content_type || "-"}
      </span>
    ),
  },
];

function adaptProxyRecordToApiCall(record: ProxyRecord): ApiCall {
  const uri = record.request.uri;
  const urlObj = uri.includes('://') ? new URL(uri) : null;
  return {
    id: record.id,
    session_id: '',
    target_id: '',
    timestamp: new Date(record.timestamp).getTime(),
    request_type: 'Other',
    method: record.request.method,
    url: uri,
    host: urlObj?.host || uri.split('://').pop()?.split('/')[0] || '',
    path: urlObj?.pathname || '/',
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
    security_state: '',
    server_ip: record.server_addr || null,
    duration_ms: null,
  };
}

function recordMatchesFilter(record: ProxyRecord, filter: ProxyFilter): boolean {
  if (filter.methods && filter.methods.length > 0) {
    if (!filter.methods.includes(record.request.method)) return false;
  }
  if (filter.status_codes && filter.status_codes.length > 0) {
    const status = record.response?.status_code;
    if (!status || !filter.status_codes.includes(status)) return false;
  }
  return true;
}

export function TrafficTable({ targetScope }: TrafficTableProps) {
  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [pagination, setPagination] = useState({ page: 1, perPage: 100, total: 0, hasMore: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newEventsCount, setNewEventsCount] = useState(0);

  const filter = useFilterStore((s) => s.filter);
  const sortOrder = useLogStore((s) => s.sortOrder);
  const setSelectedCallId = useLogStore((s) => s.setSelectedCallId);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEventRef = useRef(false);

  const fetchLogs = useCallback(async (page: number, append = false) => {
    setIsLoading(page === 1);
    setIsLoadingMore(page > 1);
    try {
      const proxyFilter = filterStateToProxyFilter(filter, targetScope);
      const result = await getHttpLogs(page, 100, proxyFilter, sortOrder);
      setPagination({
        page,
        perPage: 100,
        total: result.total,
        hasMore: result.has_more,
      });
      const adapted = result.data.map(adaptProxyRecordToApiCall);
      setCalls(prev => append ? [...prev, ...adapted] : adapted);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [filter, sortOrder, targetScope]);

  const loadMore = useCallback(async () => {
    if (!pagination.hasMore || isLoadingMore) return;
    const nextPage = pagination.page + 1;
    setIsLoadingMore(true);
    try {
      const proxyFilter = filterStateToProxyFilter(filter, targetScope);
      const result = await getHttpLogs(nextPage, 100, proxyFilter, sortOrder);
      setPagination(prev => ({
        ...prev,
        page: nextPage,
        total: result.total,
        hasMore: result.has_more,
      }));
      const adapted = result.data.map(adaptProxyRecordToApiCall);
      setCalls(prev => [...prev, ...adapted]);
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [pagination.hasMore, pagination.page, isLoadingMore, filter, sortOrder, targetScope]);

  const toggleSortOrder = useCallback(() => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    useLogStore.getState().setSortOrder(newOrder);
  }, [sortOrder]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchLogs(1);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filter, sortOrder, targetScope]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleEvent = () => {
      pendingEventRef.current = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        if (!pendingEventRef.current) return;
        pendingEventRef.current = false;

        if (pagination.page === 1) {
          await fetchLogs(1);
        } else {
          setNewEventsCount(c => c + 1);
        }
      }, 500);
    };

    const unlistenPromise = listen<ProxyRecord>('proxy-record', handleEvent);
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [pagination.page, fetchLogs]);

  const handleRefresh = () => {
    setNewEventsCount(0);
    fetchLogs(1);
  };

  if (calls.length === 0 && !isLoading) {
    return (
      <Empty>
        <EmptyTitle>No traffic yet</EmptyTitle>
        <EmptyDescription>HTTP requests will appear here once captured.</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="overflow-auto h-full flex flex-col">
      {newEventsCount > 0 && (
        <div className="flex items-center justify-center py-2 border-b bg-muted/50">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            {newEventsCount} new request{newEventsCount > 1 ? 's' : ''} - Click to refresh
          </Button>
        </div>
      )}
      <table className="w-full">
        <thead className="sticky top-0 backdrop-blur z-10 border-b">
          <tr>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[90px]">
              <button
                className="flex items-center gap-1 hover:text-foreground transition-colors"
                onClick={toggleSortOrder}
              >
                Time
                {sortOrder === 'desc' ? (
                  <ArrowDown className="h-3 w-3" />
                ) : (
                  <ArrowUp className="h-3 w-3" />
                )}
              </button>
            </th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[70px]">Method</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[150px]">Host</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 flex-1">Path</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 w-[70px]">Size</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 w-[70px]">Length</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[150px]">MIME Type</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[80px]">Ext</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <LogEntryContextMenu key={call.id} call={call} onDelete={() => {
              setCalls(prev => prev.filter(c => c.id !== call.id));
            }}>
              <tr className="hover:bg-muted/50 transition-colors border-b cursor-pointer" onClick={() => setSelectedCallId(call.id)}>
                <td className="text-xs font-mono text-muted-foreground px-3 py-2">
                  {formatTimestamp(call.timestamp)}
                </td>
                <td className="px-3 py-2 gap-2 flex">
                  {getMethodBadge(call.method)}
                  <StatusBadge status={call.response_status} />
                </td>
                <td className="text-xs truncate max-w-[150px] px-3 py-2" title={call.url}>
                  {call.host}
                </td>
                <td className="text-xs text-muted-foreground truncate max-w-[200px] px-3 py-2" title={call.url}>
                  {call.path}
                </td>
                <td className="text-xs text-muted-foreground text-right px-3 py-2">
                  {formatBytes(call.response_body_size)}
                </td>
                <td className="text-xs text-muted-foreground text-right px-3 py-2">
                  {formatBytes(call.request_body_size)}
                </td>
                <td className="text-xs text-muted-foreground px-3 py-2 truncate max-w-[150px]" title={call.response_content_type ?? undefined}>
                  {call.response_content_type || "-"}
                </td>
                <td className="text-xs font-mono text-muted-foreground px-3 py-2">
                  {getExtension(call.url)}
                </td>
              </tr>
            </LogEntryContextMenu>
          ))}
        </tbody>
      </table>
      {pagination.hasMore && (
        <div className="flex justify-center py-4 border-t">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}