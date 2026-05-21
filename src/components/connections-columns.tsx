"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProxyConnection } from "@/types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

interface ConnectionsColumnsProps {
  onAddToNewTarget: (host: string) => void;
  onAddToScope: (host: string) => void;
  loading: boolean;
}

export const connectionsColumns: (
  props: ConnectionsColumnsProps
) => ColumnDef<ProxyConnection>[] = ({ onAddToNewTarget, onAddToScope, loading }) => [
  {
    accessorKey: "host",
    header: "Host",
  },
  {
    accessorKey: "port",
    header: "Port",
    size: 80,
  },
  {
    id: "transfer",
    header: "Transfer",
    size: 100,
    cell: ({ row }) => {
      const conn = row.original;
      if (conn.clientBytes !== undefined) {
        return (
          <span className="text-muted-foreground">
            ↓{formatBytes(conn.clientBytes)} ↑{formatBytes(conn.serverBytes || 0)}
          </span>
        );
      }
      return "-";
    },
  },
  {
    id: "status",
    header: "Status",
    size: 80,
    cell: ({ row }) => {
      const conn = row.original;
      if (conn.status === "active") {
        return (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Active
          </span>
        );
      }
      return (
        <span className="text-muted-foreground">
          {conn.duration ? `${conn.duration}ms` : "-"}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    size: 120,
    cell: ({ row }) => {
      const conn = row.original;
      return (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="xs" className="h-5 w-5 p-0" asChild>
            <a
              href={`https://${conn.host}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
          <div className="relative group">
            <Button variant="ghost" size="xs" className="h-5 w-5 p-0">
              <Plus className="h-3 w-3" />
            </Button>
            <div className="absolute right-0 top-full mt-1 z-10 hidden group-hover:block">
              <div className="bg-popover border rounded-md shadow-md p-2 text-xs space-y-1 min-w-[120px]">
                <button
                  className="w-full text-left px-2 py-1 rounded hover:bg-accent"
                  onClick={() => onAddToNewTarget(conn.host)}
                  disabled={loading}
                >
                  New Target
                </button>
                <button
                  className="w-full text-left px-2 py-1 rounded hover:bg-accent"
                  onClick={() => onAddToScope(conn.host)}
                  disabled={loading}
                >
                  Add to Scope
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    },
  },
];
