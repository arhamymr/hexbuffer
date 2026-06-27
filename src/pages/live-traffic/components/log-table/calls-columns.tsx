import { useCallback, useState, useRef, memo, useMemo, type MouseEvent } from "react";
import { ArrowDown, ArrowUp, AlertTriangle, Send, EllipsisVertical, Copy, Plus, Trash2, FilePlus2, Pin, PinOff, Ban, Palette } from "lucide-react";
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { formatTimestamp, formatBytes } from "./utils";
import { StatusBadge, MethodBadge } from "@/components/status-badge";
import { LogEntryContextMenu } from "./log-context-menu";
import type { ApiCall } from '@/types';
import { useHistoryTable } from '@/pages/live-traffic/hooks/use-history-table';
import { useHistoryQueryStore } from '@/pages/live-traffic/state/history-query-store';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLogEntryActions } from '@/pages/live-traffic/hooks/use-log-entry-actions';
import { usePinnedRequestsStore } from '@/pages/live-traffic/state/pinned-requests-store';
import { useGroupsStore } from '@/pages/live-traffic/state/groups-store';
import type { GroupDefinition } from '@/pages/live-traffic/state/groups-store';
import { useBlacklistStore } from '@/pages/live-traffic/state/blacklist-store';
import { useHighlightStore, HIGHLIGHT_COLORS, HIGHLIGHT_COLOR_LABELS } from '@/pages/live-traffic/state/highlight-store';
import { CollectionPickerSubmenu } from '@/triggers/repeater/collection-picker-submenu';
import { HistoryLoadingState } from "../history-loading-state";
import { BrowserIcon } from "./browser-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateGroupDialog } from "../group-dialog";

const CallActionCell = memo(function CallActionCell({ call, onNewGroup }: { call: ApiCall; onNewGroup?: (call: ApiCall) => void }) {
  const {
    pinned,
    groups,
    requestGroupIds,
    addRequestToGroup,
    removeRequestFromGroup,
    handleQuickAddToGroup,
    handleTogglePin,
    handleCopyCurlCommand,
    handleCopyUrl,
    handleAddToScope,
    handleOpenInInvoker,
    handleOpenInRepeater,
    handleSendToCollection,
    handleSendToIntercept,
    handleOpenInBrowserAutomation,
    handleSaveToDocuments,
    handleDelete,
    handleBlacklistHost,
    handleBlacklistHostAndPath,
    handleHighlightHost,
  } = useLogEntryActions(call);

  const highlightColor = useHighlightStore((s) => s.getHighlightColor(call.host, call.path));
  const removeHighlight = useHighlightStore((s) => s.removeHighlight);

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
        {groups.length === 0 ? (
          <DropdownMenuItem onClick={handleQuickAddToGroup} className="text-xs">
            <Plus className="mr-2 size-3" /> Add to Group
          </DropdownMenuItem>
        ) : (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs">
              <Plus className="mr-2 size-3" /> Add to Group
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {groups.map((g) => (
                <DropdownMenuItem
                  key={g.id}
                  className="text-xs"
                  onClick={() => addRequestToGroup(g.id, call)}
                >
                  <span className="mr-2 size-1.5 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.name}
                  {requestGroupIds.includes(g.id) && <span className="ml-auto text-muted-foreground">✓</span>}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs" onClick={() => onNewGroup?.(call)}>
                <Plus className="mr-2 size-3" /> New Group…
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {requestGroupIds.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs">
              Remove from Group
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {requestGroupIds.map((gid) => {
                const g = groups.find((gr) => gr.id === gid);
                if (!g) return null;
                return (
                  <DropdownMenuItem
                    key={g.id}
                    className="text-xs"
                    onClick={() => removeRequestFromGroup(g.id, call.id)}
                  >
                    <span className="mr-2 size-1.5 rounded-full" style={{ backgroundColor: g.color }} />
                    {g.name}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleAddToScope} className="text-xs">
          <Plus className="mr-2 size-3" /> Add to Target
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenInInvoker} className="text-xs">
          <Send className="mr-2 size-3" /> Send to Invoker
        </DropdownMenuItem>
        <CollectionPickerSubmenu
          variant="dropdown"
          onSelect={(stashId) => { void handleSendToCollection(stashId); }}
        />
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
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-xs">
            <Palette className="mr-2 size-3" /> Highlight
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {HIGHLIGHT_COLORS.map((color) => (
              <DropdownMenuItem
                key={color}
                className="text-xs"
                onClick={() => handleHighlightHost(color)}
              >
                <span className="mr-2 size-2 rounded-full" style={{ backgroundColor: color }} />
                {HIGHLIGHT_COLOR_LABELS[color] || color}
                {highlightColor === color && <span className="ml-auto text-muted-foreground">✓</span>}
              </DropdownMenuItem>
            ))}
            {highlightColor && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs"
                  onClick={() => removeHighlight(call.host, call.path)}
                >
                  Remove Highlight
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleBlacklistHost} className="text-xs">
          <Ban className="mr-2 size-3" /> Blacklist Host
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleBlacklistHostAndPath} className="text-xs">
          <Ban className="mr-2 size-3" /> Blacklist Host + Path
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
  isGroupTabActive = false,
  activeGroupId = null,
}: {
  isPinnedTabActive?: boolean;
  isGroupTabActive?: boolean;
  activeGroupId?: string | null;
}) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const selectedCallId = useHistoryQueryStore((state) => state.selectedCallId);
  const setSelectedCallId = useHistoryQueryStore((state) => state.setSelectedCallId);
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
    removeCallLocally,
  } = useHistoryTable({ isStreamPaused: isContextMenuOpen });

  const pinnedIds = usePinnedRequestsStore((s) => s.pinnedIds);
  const unpinId = usePinnedRequestsStore((s) => s.unpinId);
  const pinnedCalls = usePinnedRequestsStore((s) => s.pinnedCalls);
  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

  const groups = useGroupsStore((s) => s.groups);
  const groupRequestIds = useGroupsStore((s) => s.groupRequestIds);
  const cachedCalls = useGroupsStore((s) => s.cachedCalls);
  const getGroupsForRequest = useGroupsStore((s) => s.getGroupsForRequest);

  const blacklistRules = useBlacklistStore((s) => s.rules);
  const isBlacklisted = useBlacklistStore((s) => s.isBlacklisted);

  const highlightedHosts = useHighlightStore((s) => s.highlightedHosts);
  const getHighlightColor = useHighlightStore((s) => s.getHighlightColor);

  const [groupDialogCall, setGroupDialogCall] = useState<ApiCall | null>(null);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);

  const handleNewGroup = useCallback((call: ApiCall) => {
    setGroupDialogCall(call);
    setIsGroupDialogOpen(true);
  }, []);

  const filteredCalls = useMemo(() => {
    // Group tab: show only cached group requests
    if (isGroupTabActive && activeGroupId) {
      const ids = groupRequestIds[activeGroupId] ?? [];
      return ids.map((id) => cachedCalls[id]).filter(Boolean);
    }

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
  }, [calls, isPinnedTabActive, isGroupTabActive, activeGroupId, pinnedSet, pinnedIds, pinnedCalls, groupRequestIds, cachedCalls]);

  // Apply blacklist filtering on top of the tab-specific filter
  const visibleCalls = useMemo(() => {
    if (blacklistRules.length === 0) return filteredCalls;
    return filteredCalls.filter((call) => !isBlacklisted(call));
  }, [filteredCalls, blacklistRules.length, isBlacklisted]);

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
      size: 120,
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
      header: "URL",
      size: 500,
      cell: ({ row, table }) => {
        const requestGroups = getGroupsForRequest(row.original.id);
        const displayUrl = (() => {
          try {
            const u = new URL(row.original.url);
            if ((u.protocol === 'https:' && u.port === '443') || (u.protocol === 'http:' && u.port === '80')) {
              u.port = '';
            }
            return u.toString();
          } catch {
            return row.original.url;
          }
        })();
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            {pinnedSet.has(row.original.id) && (
              <Pin className="size-3 text-amber-500 shrink-0" />
            )}
            {requestGroups.map((g: GroupDefinition) => (
              <span
                key={g.id}
                className="size-1.5 rounded-full shrink-0"
                style={{ backgroundColor: g.color }}
                title={g.name}
              />
            ))}
            <BrowserIcon userAgent={row.original.user_agent} />
            <span className="truncate min-w-0" style={{ direction: 'rtl', textAlign: 'left', color: getHighlightColor(row.original.host, row.original.path) || undefined }}>
              <HighlightedText
                text={displayUrl}
                query={(table.options.meta as { searchQuery?: string } | undefined)?.searchQuery ?? ""}
              />
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "referrer",
      header: "Referrer",
      size: 210,
      cell: ({ row, table }) => {
        const displayReferrer = row.original.referrer?.replace(/^https?:\/\//i, '') || '-';
        return (
          <span className="truncate block">
            <HighlightedText
              text={displayReferrer}
              query={(table.options.meta as { searchQuery?: string } | undefined)?.searchQuery ?? ""}
            />
          </span>
        );
      },
    },
    {
      accessorKey: "response_body_size",
      header: "Size",
      size: 80,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground text-right block">
          {formatBytes(row.original.response_body_size)}
        </span>
      ),
    },
    {
      accessorKey: "request_body_size",
      header: "Length",
      size: 80,
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
      cell: ({ row }) => <CallActionCell call={row.original} onNewGroup={handleNewGroup} />,
    },
  ], [pinnedSet, getGroupsForRequest, handleNewGroup, groups, groupRequestIds, highlightedHosts, getHighlightColor]);

  const trafficTableSkeletonWidths = ["70%", "85%", "80%", "95%", "60%", "55%", "75%", "40%"];

  function TrafficTableSkeletonRows({ rows = 3 }: { rows?: number }) {
    return (
      <>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center w-full border-b animate-in fade-in-0 slide-in-from-top-1 duration-300"
            aria-hidden="true"
          >
            {trafficTableSkeletonWidths.map((width, columnIndex) => (
              <div
                key={columnIndex}
                className={
                  "text-xs px-3 py-2" +
                  (columnIndex === 4 || columnIndex === 5 ? " text-right" : "")
                }
                style={{
                  width: columns[columnIndex]?.size,
                  minWidth: columns[columnIndex]?.size,
                  flex: columnIndex === 2 ? "1 1 auto" : "0 0 auto",
                }}
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
              </div>
            ))}
          </div>
        ))}
      </>
    );
  }

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.perPage));
  const table = useReactTable({
    data: visibleCalls,
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
    return <HistoryLoadingState label="Loading HTTP history..." columns={8} />;
  }

  if (isGroupTabActive && filteredCalls.length === 0) {
    return (
      <>
        <Empty>
          <EmptyTitle>No requests in this group</EmptyTitle>
          <EmptyDescription>
            Right-click a request and choose "Add to Group" to populate this group.
          </EmptyDescription>
        </Empty>
        <CreateGroupDialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen} initialCall={groupDialogCall ?? undefined} />
      </>
    );
  }

  if (visibleCalls.length === 0 && !isLoading) {
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
    <>
    <div className="h-full flex flex-col">
      {newEventsCount > 0 && (
        <div className="flex items-center justify-center py-1 border-b bg-muted/50">
          <Button variant="outline" onClick={handleRefresh}>
            {newEventsCount} new request{newEventsCount > 1 ? 's' : ''} - Click to refresh
          </Button>
        </div>
      )}
      <div ref={tableContainerRef} className="flex-1 overflow-auto">
        <div className="w-full min-w-max">
          <div
            className="relative w-full"
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
                  onNewGroup={handleNewGroup}
                >
                  <div
                    className={
                      "absolute left-0 right-0 flex items-center w-full min-w-0 font-mono transition-colors border-b cursor-pointer" +
                      (pinnedSet.has(call.id) ? " bg-amber-500/10 dark:bg-amber-800/20" : "") +
                      (isGroupTabActive ? " bg-sky-500/5 dark:bg-sky-950/20" : "") +
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
                        <div
                          key={cell.id}
                          className={
                            "text-xs text-muted-foreground px-3 py-1 truncate" +
                            (isRightAligned ? " text-right" : isCentered ? " text-center" : "")
                          }
                          title={
                            cell.column.id === "host"
                              ? call.url
                              : cell.column.id === "response_content_type"
                                ? call.response_content_type ?? undefined
                                : undefined
                          }
                          style={{
                            width: cell.column.getSize(),
                            minWidth: cell.column.getSize(),
                            flex: cell.column.id === "host" ? "1 1 auto" : "0 0 auto",
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      );
                    })}
                  </div>
                </LogEntryContextMenu>
              );
            })}
          </div>
        </div>
        {isLoading && calls.length > 0 && (
          <div className="w-full min-w-[850px]">
            <TrafficTableSkeletonRows />
          </div>
        )}
        {isLoadingMore && (
          <div className="w-full min-w-[850px]">
            <TrafficTableSkeletonRows rows={2} />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 p-1 border-t">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Showing {visibleCalls.length} of {pagination.total} request{pagination.total === 1 ? '' : 's'}
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
    <CreateGroupDialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen} initialCall={groupDialogCall ?? undefined} />
    </>
  );
});
