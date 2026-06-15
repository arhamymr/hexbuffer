'use client';

import { useCallback, useState, useRef, memo, useMemo, type MouseEvent } from "react";
import { ArrowDown, ArrowUp, AlertTriangle, Send, EllipsisVertical, Copy, Plus, Trash2, FilePlus2, Pin, PinOff } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatTimestamp, formatBytes } from "./utils";
import { StatusBadge, MethodBadge } from "@/components/status-badge";
import { LogEntryContextMenu } from "./log-context-menu";
import type { ApiCall } from '@/types';
import { useHistoryTable } from '@/pages/live-traffic/hooks/use-history-table';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { deleteHistoryLog, fetchHistoryDetail } from '@/pages/live-traffic/services/history-service';
import { createDefaultAttackConfig, findRequestPayloadPositions } from '@/pages/invoker/types';
import { useInvokerStore } from '@/stores/invoker';
import { useDocumentsStore } from '@/stores/documents';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { useHistoryQuery } from '@/pages/live-traffic/hooks/use-history-query';
import { adaptProxyRecordToApiCall } from '@/pages/live-traffic/hooks/use-history-table';
import { useRepeaterStore } from '@/stores/repeater';
import { buildHttpCurlCommand, buildRawHttpRequest } from '@/lib/http-message';
import { copyText } from '@/lib/clipboard';
import { useTargetStore } from '@/stores/target';
import { useNavStore } from '@/stores/nav';
import { useInterceptStore } from '@/pages/intercept/state/intercept-store';
import { usePinnedRequestsStore } from '@/pages/live-traffic/state/pinned-requests-store';
import { HistoryLoadingState } from "../history-loading-state";
import { BrowserIcon } from "./browser-icon";
import { Skeleton } from "@/components/ui/skeleton";

const CallActionCell = memo(function CallActionCell({ call }: { call: ApiCall }) {
  const { triggerRefresh } = useHistoryQuery();
  const togglePin = usePinnedRequestsStore((s) => s.togglePin);
  const isPinned = usePinnedRequestsStore((s) => s.isPinned);
  const pinned = isPinned(call.id);

  const handleTogglePin = useCallback(() => {
    togglePin(call);
  }, [call, togglePin]);

  const handleCopyCurlCommand = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      const curl = buildHttpCurlCommand({
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.request_body ?? '',
      });
      if (await copyText(curl)) toast.success('Copied as curl command (bash)');
      else toast.error('Failed to copy as curl command (bash)');
    } catch (error) {
      console.error('Failed to copy curl command:', error);
      toast.error('Failed to copy as curl command (bash)');
    }
  }, [call.id]);

  const handleCopyUrl = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      if (await copyText(request.url)) toast.success('Copied URL');
      else toast.error('Failed to copy URL');
    } catch {
      if (await copyText(call.url)) toast.success('Copied URL');
      else toast.error('Failed to copy URL');
    }
  }, [call.id, call.url]);

  const handleAddToScope = useCallback(() => {
    const target = useTargetStore.getState().addHostTarget(call.host);
    if (!target) {
      toast.error('Host is unavailable');
      return;
    }
    toast.success(`Added ${target.name} to targets`);
  }, [call.host]);

  const handleOpenInInvoker = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      const baseRequest = {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.request_body || '',
        follow_redirects: true,
        max_hops: 10,
      };
      const config = {
        ...createDefaultAttackConfig(),
        name: `${request.method} ${request.path || request.url}`,
        base_request: baseRequest,
        positions: findRequestPayloadPositions(baseRequest),
      };
      useInvokerStore.getState().addAttackTab(config);
      useNavStore.getState().triggerNavBlink('/invoker');
      toast.success(`Sent ${request.method} ${request.path || request.url} to Invoker`);
    } catch (error) {
      console.error('Failed to open request in Invoker:', error);
      toast.error('Failed to open request in Invoker');
    }
  }, [call.id]);

  const handleOpenInRepeater = useCallback(async () => {
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
      useNavStore.getState().triggerNavBlink('/repeater');
      toast.success(`Sent ${request.method} ${request.path || request.url} to Repeater`);
    } catch (error) {
      console.error('Failed to open request in Repeater:', error);
      toast.error('Failed to open request in Repeater');
    }
  }, [call.id]);

  const handleSendToIntercept = useCallback(() => {
    const host = call.host?.trim();
    if (!host) {
      toast.error('Host is unavailable');
      return;
    }
    useInterceptStore.getState().addTabForHost(host);
    useNavStore.getState().triggerNavBlink('/intercept');
    toast.success(`Intercept tab created for ${host}`);
  }, [call.host]);

  const handleOpenInBrowserAutomation = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      const targetUrl = (() => {
        try {
          return new URL(request.url).origin;
        } catch {
          const host = request.host || request.url.replace(/^https?:\/\//i, '').split('/')[0];
          return host ? `https://${host}` : request.url;
        }
      })();
      useBrowserAutomationStore.getState().addAutomationTab(
        { targetUrl },
        request.host || targetUrl
      );
      useNavStore.getState().triggerNavBlink('/browser-automation');
      toast.success(`Sent ${request.host || targetUrl} to Browser Automation`);
    } catch (error) {
      console.error('Failed to open target in Browser Automation:', error);
      toast.error('Failed to open target in Browser Automation');
    }
  }, [call.id]);

  const handleSaveToDocuments = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      useDocumentsStore.getState().addApiEntryToActiveDocument({
        sourceHistoryId: request.id,
        method: request.method,
        url: request.url,
        host: request.host,
        path: request.path,
        headers: request.headers,
        requestBody: request.request_body,
        responseStatus: request.response_status,
        responseContentType: request.response_content_type,
        capturedAt: request.timestamp,
      });
      toast.success('Saved API to active document');
    } catch (error) {
      console.error('Failed to save API to documents:', error);
      toast.error('Failed to save API to documents');
    }
  }, [call.id]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteHistoryLog(call.id);
      triggerRefresh();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  }, [call.id, triggerRefresh]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center justify-center size-6 rounded hover:bg-muted-foreground/15 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <EllipsisVertical className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopyCurlCommand} className="text-xs">
          <Copy className="mr-2 size-3" /> Copy as curl command (bash)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyUrl} className="text-xs">
          <Copy className="mr-2 size-3" /> Copy URL
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleTogglePin} className="text-xs">
          {pinned
            ? <><PinOff className="mr-2 size-3" /> Unpin</>
            : <><Pin className="mr-2 size-3" /> Pin</>
          }
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleAddToScope} className="text-xs">
          <Plus className="mr-2 size-3" /> Add to Target
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenInInvoker} className="text-xs">
          <Send className="mr-2 size-3" /> Send to Invoker
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenInRepeater} className="text-xs">
          <Send className="mr-2 size-3" /> Send to Repeater
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSendToIntercept} className="text-xs">
          <Send className="mr-2 size-3" /> Send to Intercept
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenInBrowserAutomation} className="text-xs">
          <Send className="mr-2 size-3" /> Send to Automate Browser
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSaveToDocuments} className="text-xs">
          <FilePlus2 className="mr-2 size-4" /> Save to Documents
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} variant="destructive" className="text-xs">
          <Trash2 className="mr-2 size-3" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export const TrafficTable = memo(function TrafficTable({
  isPinnedTabActive = false,
}: {
  isPinnedTabActive?: boolean;
}) {
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

  const pinnedIds = usePinnedRequestsStore((s) => s.pinnedIds);
  const unpinId = usePinnedRequestsStore((s) => s.unpinId);
  const pinnedCalls = usePinnedRequestsStore((s) => s.pinnedCalls);
  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

  const filteredCalls = useMemo(() => {
    const pinned: ApiCall[] = [];
    const unpinned: ApiCall[] = [];
    const seenIds = new Set<string>();

    // First, add all cached pinned calls from the store (survive pagination)
    for (const id of pinnedIds) {
      const cached = pinnedCalls[id];
      if (cached) {
        pinned.push(cached);
        seenIds.add(id);
      }
    }

    // Then partition current page calls, skipping any already added from cache
    for (const call of calls) {
      if (seenIds.has(call.id)) continue;
      if (pinnedSet.has(call.id)) {
        pinned.push(call);
      } else {
        unpinned.push(call);
      }
    }

    if (isPinnedTabActive) return pinned;
    return [...pinned, ...unpinned];
  }, [calls, isPinnedTabActive, pinnedSet, pinnedIds, pinnedCalls]);

  const removeCallLocallyWithUnpin = useCallback(
    (id: string) => {
      unpinId(id);
      removeCallLocally(id);
    },
    [removeCallLocally, unpinId]
  );

  const columns = useMemo<ColumnDef<ApiCall>[]>(() => [
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
          {pinnedSet.has(row.original.id) && (
            <Pin className="size-3 text-amber-500 shrink-0" />
          )}
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
    {
      id: "action",
      header: "",
      size: 36,
      cell: ({ row }) => <CallActionCell call={row.original} />,
    },
  ], [pinnedSet]);

  const trafficTableSkeletonWidths = ["70%", "85%", "80%", "95%", "60%", "55%", "75%", "40%"];

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

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.perPage));
  const table = useReactTable({
    data: filteredCalls,
    columns: columns,
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
    return <HistoryLoadingState label="Loading HTTP history..." columns={9} />;
  }

  if (calls.length === 0 && !isLoading) {
    return (
      <Empty>
        <EmptyTitle>
          {isPinnedTabActive
            ? 'No pinned requests'
            : hasActiveFilters || hasScopedTab
              ? 'No matching traffic'
              : 'No traffic yet'}
        </EmptyTitle>
        <EmptyDescription>
          {isPinnedTabActive
            ? 'Right-click a request and select Pin to add it here (max 10).'
            : hasActiveFilters || hasScopedTab
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
                  onDelete={removeCallLocallyWithUnpin}
                  onOpenChange={handleContextMenuOpenChange}
                >
                  <tr
                    className={
                      "absolute flex items-center w-full font-mono transition-colors border-b cursor-pointer" +
                      (pinnedSet.has(call.id) ? " bg-amber-500/5 dark:bg-amber-950/20" : "") +
                      (call.id === selectedCallId
                        ? " hover:!bg-muted bg-muted"
                        : " hover:bg-muted/50")
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
            Showing {filteredCalls.length} of {pagination.total} request{pagination.total === 1 ? '' : 's'}
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
