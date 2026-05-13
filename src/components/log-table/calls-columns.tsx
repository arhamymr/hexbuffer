"use client";

import { ApiCall } from "@/types";
import { formatTimestamp, formatBytes, getMethodBadge, getStatusColor } from "@/components/log-table/constants";

function formatTime(timestamp: number): string {
  return formatTimestamp(timestamp);
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "-";
  return `${ms}ms`;
}

function StatusBadge({ status }: { status: number | null }) {
  if (status === null || status === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }
  const colorClass = getStatusColor(status);
  return (
    <span className={`text-xs px-1 py-0.5 rounded font-mono text-white ${colorClass}`}>
      {status}
    </span>
  );
}

interface TrafficTableProps {
  calls: ApiCall[];
  onSelect: (id: string) => void;
}

export function TrafficTable({ calls, onSelect }: TrafficTableProps) {
  return (
    <div className="overflow-auto h-full">
      <table className="w-full">
        <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10 border-b">
          <tr>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[100px]">Time</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[100px]">Method</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[180px]">Host</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 flex-1">Path</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 w-[80px]">Size</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2 w-[90px]">Duration</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <tr
              key={call.id}
              className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => onSelect(call.id)}
            >
              <td className="text-xs font-mono text-muted-foreground px-1 py-1">
                {formatTime(call.timestamp)}
              </td>
              <td className="px-1 py-1">
                <div className="flex gap-2">
 {getMethodBadge(call.method)}
                <StatusBadge status={call.response_status} />
                </div>
               
              </td>
              <td className="text-xs truncate font-mono max-w-[180px] px-1 py-1" title={call.host}>
                {call.host}
              </td>
              <td className="text-xs text-muted-foreground fomr truncate max-w-[300px] px-1 py-1" title={call.path}>
                {call.path}
              </td>
              <td className="text-xs text-muted-foreground text-right px-1 py-1">
                {formatBytes(call.response_body_size)}
              </td>
              <td className="text-xs text-muted-foreground text-right px-1 py-1">
                {formatDuration(call.duration_ms)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}