'use client';

import { useCallback, useState, useRef, memo, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, AlertTriangle, Send } from "lucide-react";
import { toast } from "sonner";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { HighlightedText } from "@/components/highlighted-text";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatTimestamp, formatBytes } from "./utils";
import { StatusBadge, MethodBadge } from "@/components/status-badge";
import { LogEntryContextMenu } from "./log-context-menu";
import type { ApiCall } from '@/types';
import { useHistoryTable } from '@/pages/live-traffic/hooks/use-history-table';
import { Button } from "@/components/ui/button";
// import { fetchHistoryDetail } from "@/pages/live-traffic/services/history-service";
// import { adaptProxyRecordToApiCall } from "@/pages/live-traffic/hooks/use-history-table";
// import { buildRawHttpRequest } from "@/lib/http-message";
// import { useRepeaterStore } from "@/stores/repeater";
import { HistoryLoadingState } from "../history-loading-state";
import { BrowserIcon } from "./browser-icon";
import { Skeleton } from "@/components/ui/skeleton";

interface SendToRepeaterButtonProps {
  call: ApiCall;
}

export const callsColumns: ColumnDef<ApiCall>[] = [
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
    size: 100,
    cell: ({ row }) => (
      <div className="flex gap-2">
        <MethodBadge method={row.original.method} />
        <StatusBadge status={row.original.response_status} />
        {row.original.content_decoded && (
          <span title="Request body was decoded from gzip/br/deflate">
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "host",
    header: "Host",
    size: 180,
    cell: ({ row, table }) => (
      <div className="flex items-center gap-1.5 truncate">
        <BrowserIcon userAgent={row.original.user_agent} />
        <span className="truncate">
          <HighlightedText
            text={row.original.host}
            query={(table.options.meta as { searchQuery?: string } | undefined)?.searchQuery ?? ""}
          />
        </span>
      </div>
    ),
  },
  {
    accessorKey: "path",
    header: "Path",
    size: 200,
    cell: ({ row, table }) => (
      <HighlightedText
        text={row.original.path}
        query={(table.options.meta as { searchQuery?: string } | undefined)?.searchQuery ?? ""}
      />
    ),
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
    cell: ({ row, table }) => (
      <span className="text-xs text-muted-foreground truncate block">
        <HighlightedText
          text={row.original.response_content_type || "-"}
          query={(table.options.meta as { searchQuery?: string } | undefined)?.searchQuery ?? ""}
        />
      </span>
    ),
  },
];

const trafficTableSkeletonWidths = ["70%", "85%", "80%", "95%", "60%", "55%", "75%"];

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

export const TrafficTable = memo(function TrafficTable() {
  const tableContainerRef = useRef<HTMLDivElement>(null);
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
  const table = useReactTable({
    data: calls,
    columns: callsColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    meta: {
      searchQuery,
    },
  });
  const tableRows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  const handleContextMenuOpenChange = useCallback((open: boolean) => {
    setIsContextMenuOpen(open);
  }, []);

  const handleRowClick = useCallback((callId: string) => {
    setSelectedCallId(callId);
  }, [setSelectedCallId]);

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
    <div className="h-full flex flex-col">
      {newEventsCount > 0 && (
        <div className="flex items-center justify-center py-1 border-b bg-muted/50">
          <Button variant="outline" size="xs" onClick={handleRefresh}>
            {newEventsCount} new request{newEventsCount > 1 ? 's' : ''} - Click to refresh
          </Button>
        </div>
      )}
      <div ref={tableContainerRef} className="flex-1 overflow-auto min-h-0">
        <table className="grid w-full min-w-[850px]">
          <thead className="sticky top-0 z-10 grid border-b bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="flex  w-full">
                {headerGroup.headers.map((header) => {
                  const isRightAligned =
                    header.column.id === "response_body_size" ||
                    header.column.id === "request_body_size";
                  const isCentered = header.column.id === "action";

                  return (
                    <th
                      key={header.id}
                      className={
                        "text-xs font-medium text-muted-foreground px-3 py-1" +
                        (isRightAligned ? " text-right" : isCentered ? " text-center" : " text-left")
                      }
                      style={{
                        width: header.column.getSize(),
                        flex: header.column.id === "path" ? "1 1 auto" : "0 0 auto",
                      }}
                    >
                      {header.isPlaceholder ? null : header.column.id === "timestamp" ? (
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
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody
            className="grid relative"
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = tableRows[virtualRow.index];
              const call = row.original;

              return (
                <LogEntryContextMenu
                  key={row.id}
                  call={call}
                  onDelete={removeCallLocally}
                  onOpenChange={handleContextMenuOpenChange}
                >
                  <tr
                    className={
                      "absolute flex items-center w-full hover:bg-muted/50 font-mono transition-colors border-b cursor-pointer" +
                      (call.id === selectedCallId ? " hover:!bg-muted bg-muted" : "")
                    }
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => handleRowClick(call.id)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isRightAligned =
                        cell.column.id === "response_body_size" ||
                        cell.column.id === "request_body_size";
                      const isCentered = cell.column.id === "action";

                      return (
                        <td
                          key={cell.id}
                          className={
                            "text-xs text-muted-foreground px-3 py-1 truncate" +
                            (isRightAligned ? " text-right" : isCentered ? " text-center" : "")
                          }
                          title={
                            cell.column.id === "host" ||
                            cell.column.id === "path"
                              ? call.url
                              : cell.column.id === "response_content_type"
                                ? call.response_content_type ?? undefined
                                : undefined
                          }
                          style={{
                            width: cell.column.getSize(),
                            flex: cell.column.id === "path" ? "1 1 auto" : "0 0 auto",
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                </LogEntryContextMenu>
              );
            })}
          </tbody>
        </table>
        {isLoading && calls.length > 0 && (
          <table className="w-full min-w-[850px]">
            <tbody>
              <TrafficTableSkeletonRows />
            </tbody>
          </table>
        )}
        {isLoadingMore && (
          <table className="w-full min-w-[850px]">
            <tbody>
              <TrafficTableSkeletonRows rows={2} />
            </tbody>
          </table>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 p-1 border-t">
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
          className="text-[10px]"
        >
          {isLoadingMore ? "Loading..." : "LOAD MORE"}
        </Button>
      </div>
    </div>
  );
});
