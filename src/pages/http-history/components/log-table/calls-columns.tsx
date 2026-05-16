import { useReactTable } from "@tanstack/react-table";
import { ColumnDef, getCoreRowModel, getSortedRowModel, SortingState, flexRender } from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { formatTimestamp, formatBytes, getMethodBadge, StatusBadge, getExtension } from "./utils";
import { LogEntryContextMenu } from "./log-context-menu";
import { listen } from '@tauri-apps/api/event';
import { useEffect, useRef, useState } from "react";
import type { ProxyRecord } from '@/types';
import type { ApiCall } from '@/types';
import { useHttpHistoryStore } from '@/stores/http-history';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TrafficTableProps {
  targetScope?: string[];
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

export function TrafficTable({ targetScope }: TrafficTableProps) {
  const calls = useHttpHistoryStore((state) => state.calls);
  const filter = useHttpHistoryStore((state) => state.filter);
  const fetchLogs = useHttpHistoryStore((state) => state.fetchLogs);
  const loadMore = useHttpHistoryStore((state) => state.loadMore);
  const addCall = useHttpHistoryStore((state) => state.addCall);
  const pagination = useHttpHistoryStore((state) => state.pagination);
  const isLoadingMore = useHttpHistoryStore((state) => state.isLoadingMore);
  const sortOrder = useHttpHistoryStore((state) => state.sortOrder);
  const toggleSortOrder = useHttpHistoryStore((state) => state.toggleSortOrder);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevScopeRef = useRef<string[] | undefined>(undefined);

  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: calls,
    columns: callsColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  });

  useEffect(() => {
    const unlistenPromise = listen<ProxyRecord>('proxy-record', (event) => {
      addCall(event.payload);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [addCall]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (prevScopeRef.current !== targetScope) {
      prevScopeRef.current = targetScope;
      fetchLogs(targetScope);
    } else {
      debounceRef.current = setTimeout(() => {
        fetchLogs(targetScope);
      }, 300);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [filter, targetScope, fetchLogs]);

  if (calls.length === 0) {
    return (
      <Empty>
        <EmptyTitle>No traffic yet</EmptyTitle>
        <EmptyDescription>HTTP requests will appear here once captured.</EmptyDescription>
      </Empty>
    );
  }

  const timeColumn = table.getColumn("timestamp");
  const isSorted = sorting.length > 0;

  return (
    <div className="overflow-auto h-full flex flex-col">
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
            <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 w-[80px]">Duration</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 w-[70px]">Length</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[150px]">MIME Type</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[80px]">Ext</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[120px]">IP</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => {
            return (
            <LogEntryContextMenu key={call.id} call={call}>
              <tr className="hover:bg-muted/50 transition-colors border-b cursor-pointer" onClick={() => useHttpHistoryStore.getState().setSelectedCallId(call.id)}>
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
                <td className="text-xs text-muted-foreground text-right px-3 py-2">-</td>
                <td className="text-xs text-muted-foreground text-right px-3 py-2">
                  {formatBytes(call.request_body_size)}
                </td>
                <td className="text-xs text-muted-foreground px-3 py-2 truncate max-w-[150px]" title={call.response_content_type ?? undefined}>
                  {call.response_content_type || "-"}
                </td>
                <td className="text-xs font-mono text-muted-foreground px-3 py-2">
                  {getExtension(call.url)}
                </td>
                <td className="text-xs font-mono text-muted-foreground px-3 py-2">
                  {call.server_ip || "-"}
                </td>
              </tr>
            </LogEntryContextMenu>
            );
          })}
        </tbody>
      </table>
      {pagination.hasMore && (
        <div className="flex justify-center py-4 border-t">
          <Button
            variant="outline"
            onClick={() => loadMore(targetScope)}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}