"use client";

import { formatTimestamp, formatBytes, formatDuration, getMethodBadge, StatusBadge, getExtension } from "./utils";
import { LogEntryContextMenu } from "./log-context-menu";

interface Call {
  id: string;
  timestamp: number;
  method: string;
  response_status: number;
  host: string;
  path: string;
  response_body_size: number;
  duration_ms: number;
  request_body_size: number;
  response_content_type?: string;
  url: string;
  server_ip?: string;
}

interface TrafficTableProps {
  calls: Call[];
  onSelectCall?: (id: string) => void;
}

export function TrafficTable({ calls, onSelectCall }: TrafficTableProps) {

  return (
    <div className="overflow-auto h-full">
      <table className="w-full">
        <thead className="sticky top-0 backdrop-blur z-10 border-b">
          <tr>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[90px]">Time</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[70px]">Method</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[60px]">Status</th>
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
          {calls.map((call, index) => (
            <LogEntryContextMenu key={call.id} call={call}>
              <tr
                className={`cursor-pointer hover:bg-muted/50 transition-colors ${index !== calls.length - 1 ? 'border-b' : ''}`}
                onClick={() => onSelectCall?.(call.id)}
              >
                <td className="text-xs font-mono text-muted-foreground px-3 py-2">
                  {formatTimestamp(call.timestamp)}
                </td>
                <td className="px-3 py-2">
                  {getMethodBadge(call.method)}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={call.response_status} />
                </td>
                <td className="text-xs truncate max-w-[150px] px-3 py-2" title={call.host}>
                  {call.host}
                </td>
                <td className="text-xs text-muted-foreground truncate max-w-[200px] px-3 py-2" title={call.path}>
                  {call.path}
                </td>
                <td className="text-xs text-muted-foreground text-right px-3 py-2">
                  {formatBytes(call.response_body_size)}
                </td>
                <td className="text-xs text-muted-foreground text-right px-3 py-2">
                  {formatDuration(call.duration_ms)}
                </td>
                <td className="text-xs text-muted-foreground text-right px-3 py-2">
                  {formatBytes(call.request_body_size)}
                </td>
                <td className="text-xs text-muted-foreground px-3 py-2 truncate max-w-[150px]" title={call.response_content_type || "-"}>
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
          ))}
        </tbody>
      </table>
    </div>
  );
}