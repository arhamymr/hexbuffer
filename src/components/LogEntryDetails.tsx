import type { ProxyLogEntry } from '@/hooks/useDebugLogs';
import { formatBytes } from './constants';

interface LogEntryDetailsProps {
  proxyData: ProxyLogEntry;
}

export function LogEntryDetails({ proxyData }: LogEntryDetailsProps) {
  return (
    <div className="space-y-3 text-xs font-mono">
      <div className="grid grid-cols-2 gap-2">
        <div><span className="text-muted-foreground">Method:</span> {proxyData.method}</div>
        <div><span className="text-muted-foreground">Status:</span> {proxyData.status} {proxyData.status_text}</div>
        <div><span className="text-muted-foreground">Host:</span> {proxyData.host}</div>
        <div><span className="text-muted-foreground">Port:</span> {proxyData.port}</div>
        <div><span className="text-muted-foreground">Duration:</span> {proxyData.duration_ms}ms</div>
        <div><span className="text-muted-foreground">Client:</span> {proxyData.client_addr}</div>
        <div><span className="text-muted-foreground">Client Bytes:</span> {formatBytes(proxyData.client_bytes)}</div>
        <div><span className="text-muted-foreground">Server Bytes:</span> {formatBytes(proxyData.server_bytes)}</div>
      </div>
      {proxyData.url && (
        <div>
          <span className="text-muted-foreground">URL:</span>
          <div className="mt-1 p-2 bg-background rounded break-all">{proxyData.url}</div>
        </div>
      )}
    </div>
  );
}
