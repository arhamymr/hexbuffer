"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ApiCall } from "@/types";

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function MethodBadge({ method }: { method: string }) {
  const variant =
    method === "GET"
      ? "secondary"
      : method === "POST"
        ? "default"
        : method === "PUT"
          ? "outline"
          : "destructive";
  return (
    <Badge
      variant={variant as "secondary" | "default" | "outline" | "destructive"}
      className="font-mono text-xs px-1.5"
    >
      {method}
    </Badge>
  );
}

export const callsColumns: ColumnDef<ApiCall>[] = [
  {
    accessorKey: "method",
    header: "Method",
    size: 80,
    cell: ({ row }) => <MethodBadge method={row.getValue("method")} />,
  },
  {
    accessorKey: "host",
    header: "Host",
  },
  {
    accessorKey: "path",
    header: "Path",
    cell: ({ row }) => (
      <span className="text-muted-foreground truncate max-w-[200px] block">
        {row.getValue("path")}
      </span>
    ),
  },
  {
    accessorKey: "timestamp",
    header: "Time",
    size: 100,
    cell: ({ row }) => formatTime(row.getValue("timestamp")),
  },
];
