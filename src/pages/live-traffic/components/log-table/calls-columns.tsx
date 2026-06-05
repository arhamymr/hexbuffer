'use client';

import { useCallback, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, AlertTriangle, Send } from "lucide-react";
import { toast } from "sonner";
import { HighlightedText } from "@/components/highlighted-text";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatTimestamp, formatBytes, getExtension } from "./utils";
import { StatusBadge, MethodBadge } from "@/components/status-badge";
import { LogEntryContextMenu } from "./log-context-menu";
import type { ApiCall } from '@/types';
import { useHistoryTable } from '@/pages/live-traffic/hooks/use-history-table';
import { Button } from "@/components/ui/button";
import { fetchHistoryDetail } from "@/pages/live-traffic/services/history-service";
import { adaptProxyRecordToApiCall } from "@/pages/live-traffic/hooks/use-history-table";
import { buildRawHttpRequest } from "@/lib/http-message";
import { useRepeaterStore } from "@/stores/repeater";
import { HistoryLoadingState } from "../history-loading-state";
import { BrowserIcon } from "./browser-icon";
import { Skeleton } from "@/components/ui/skeleton";

interface SendToRepeaterButtonProps {
  call: ApiCall;
}

function SendToRepeaterButton({ call }: SendToRepeaterButtonProps) {
  const navigate = useNavigate();

  const handleSendToRepeater = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      useRepeaterStore.getState().addRequestTab({
        raw: buildRawHttpRequest({
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: request.request_body || '',
        }),
        url: request.url,
      });
      navigate('/repeater');
      toast.success('Sent to Repeater');
    } catch (error) {
      console.error('Failed to send request to Repeater:', error);
      toast.error('Failed to send to Repeater');
    }
  };

  return (
    <Button
      type="button"
      size="xs"
      variant="ghost"
      className="h-6 px-2"
      onClick={handleSendToRepeater}
      title="Send to Repeater"
    >
      <Send className="size-3 text-muted-foreground" />
    </Button>
  );
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
        <MethodBadge method={row.original.method} />
        <StatusBadge status={row.original.response_status} />
      </div>
    ),
  },
  {
    accessorKey: "host",
    header: "Host",
    size: 180,
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 truncate">
        <BrowserIcon userAgent={row.original.user_agent} />
        <span className="truncate">{row.original.host}</span>
      </div>
    ),
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
  {
    id: "action",
    header: "Action",
    size: 70,
    cell: ({ row }) => <SendToRepeaterButton call={row.original} />,
  },
];

const trafficTableSkeletonWidths = ["70%", "85%", "80%", "95%", "60%", "55%", "75%", "36px"];

function TrafficTableSkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr
          key={rowIndex}
          className="border-b animate-in fade-in-0 slide-in-from-top-1 duration-300"
          aria-hidden="true"
        >
          {trafficTableSkeletonWidths.map((width, columnIndex) => (
            <td
              key={columnIndex}
              className={columnIndex === 4 || columnIndex === 5 ? "px-3 py-2 text-right" : "px-3 py-2"}
            >
              <Skeleton
                className={columnIndex === 7 ? "mx-auto h-5 w-9" : "h-3"}
                style={{
                  width:
                    columnIndex === 7
                      ? undefined
                      : rowIndex % 2 === 0
                        ? width
                        : `${Math.max(45, Number.parseInt(width, 10) - 12)}%`,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function TrafficTable() {
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const {
    calls,
    pagination,
    isLoading,
    isLoadingMore,
    newEventsCount,
    loadError,
    sortOrder,
    searchQuery,
    hasActiveFilters,
    hasScopedTab,
    loadMore,
    handleRefresh,
    toggleSortOrder,
    setSelectedCallId,
    removeCallLocally,
    selectedCallId,
  } = useHistoryTable({ isStreamPaused: isContextMenuOpen });
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.perPage));

  const handleContextMenuOpenChange = useCallback((open: boolean) => {
    setIsContextMenuOpen(open);
  }, []);

  if (loadError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Failed to load HTTP history</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading && calls.length === 0) {
    return <HistoryLoadingState label="Loading HTTP history..." columns={8} />;
  }

  if (calls.length === 0 && !isLoading) {
    return (
      <Empty>
        <EmptyTitle>{hasActiveFilters || hasScopedTab ? 'No matching traffic' : 'No traffic yet'}</EmptyTitle>
        <EmptyDescription>
          {hasActiveFilters || hasScopedTab
            ? 'The database has traffic, but the current tab or filters may be hiding it. Switch to All History or clear the active filters.'
            : 'HTTP requests will appear here once captured.'}
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="overflow-auto h-full flex flex-col">
      {newEventsCount > 0 && (
        <div className="flex items-center justify-center py-1 border-b bg-muted/50">
          <Button variant="outline" size="xs" onClick={handleRefresh}>
            {newEventsCount} new request{newEventsCount > 1 ? 's' : ''} - Click to refresh
          </Button>
        </div>
      )}
      <table className="w-full">
        <thead className="sticky top-0 z-10 border-b bg-muted">
          <tr>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-1 w-[90px]">
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
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-1 w-[70px]">Method</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-1 w-[150px]">Host</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-1 flex-1">Path</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-3 py-1 w-[70px]">Size</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-3 py-1 w-[70px]">Length</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-1 w-[150px]">MIME Type</th>
            <th className="text-center text-xs font-medium text-muted-foreground px-3 py-1 w-[70px]">Action</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <LogEntryContextMenu
              key={call.id}
              call={call}
              onDelete={removeCallLocally}
              onOpenChange={handleContextMenuOpenChange}
            >
              <tr
                className={'hover:bg-muted/50 font-mono transition-colors border-b cursor-pointer' + (call.id === selectedCallId ? ' hover:!bg-muted bg-muted' : '')}
                onClick={() => setSelectedCallId(call.id)}
              >
                <td className="text-xs text-muted-foreground px-3 py-1">
                  {formatTimestamp(call.timestamp)}
                </td>
                <td className="px-3 py-1 gap-2 flex">
                  <MethodBadge method={call.method} />
                  <StatusBadge status={call.response_status} />
                  {call.content_decoded && (
                    <span title="Request body was decoded from gzip/br/deflate">
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                    </span>
                  )}
                </td>
                <td className="text-xs truncate max-w-[250px] px-3 py-1" title={call.url}>
                  <div className="flex items-center gap-1.5">
                    <BrowserIcon userAgent={call.user_agent} />
                    <span className="truncate">
                      <HighlightedText text={call.host} query={searchQuery} />
                    </span>
                  </div>
                </td>
                <td className="text-xs text-muted-foreground truncate max-w-[200px] px-3 py-1" title={call.url}>
                  <HighlightedText text={call.path} query={searchQuery} />
                </td>
                <td className="text-xs text-muted-foreground text-right px-3 py-1">
                  {formatBytes(call.response_body_size)}
                </td>
                <td className="text-xs text-muted-foreground text-right px-3 py-1">
                  {formatBytes(call.request_body_size)}
                </td>
                <td className="text-xs text-muted-foreground px-3 py-1 truncate max-w-[150px]" title={call.response_content_type ?? undefined}>
                  <HighlightedText text={call.response_content_type || "-"} query={searchQuery} />
                </td>
                <td className="text-center px-3 py-1">
                  <SendToRepeaterButton call={call} />
                </td>
              </tr>
            </LogEntryContextMenu>
          ))}
          {isLoading && calls.length > 0 && <TrafficTableSkeletonRows />}
          {isLoadingMore && <TrafficTableSkeletonRows rows={2} />}
        </tbody>
      </table>
      <div className="flex items-center justify-between gap-3 px-3 py-4 border-t">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Showing {calls.length} of {pagination.total} request{pagination.total === 1 ? '' : 's'}
          </span>
          <span>
            {pagination.page}/{totalPages} page
          </span>
        </div>
        <Button
          size="xs"
          variant="outline"
          onClick={loadMore}
          disabled={!pagination.hasMore || isLoadingMore}
        >
          {isLoadingMore ? "Loading..." : "Load More"}
        </Button>
      </div>
    </div>
  );
}
