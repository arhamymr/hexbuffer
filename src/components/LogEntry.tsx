'use client';

import { ChevronRight, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { DebugLog, ProxyLogEntry } from '@/stores/trafficStore';
import { formatTimestamp, getMethodBadge, getStatusColor, formatBytes } from './constants';
import { LogEntryTabs } from './LogEntryTabs';
import { LogEntryContextMenu } from './LogEntryContextMenu';

interface LogEntryProps {
  log: DebugLog;
  expanded: boolean;
  onToggle: () => void;
  activeTargetId?: string | null;
}

export function LogEntry({ log, expanded, onToggle, activeTargetId }: LogEntryProps) {
  const isProxyLog = log.type === 'proxy-log';
  const proxyData = isProxyLog ? log.data as ProxyLogEntry : null;

  const rowContent = (
    <div
      className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 cursor-pointer"
      onClick={onToggle}
    >
      <span className="text-xs text-muted-foreground font-mono w-28 flex-shrink-0">
        {proxyData ? formatTimestamp(proxyData.timestamp) : formatTimestamp(log.timestamp)}
      </span>

      {isProxyLog && proxyData && (
        <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {proxyData.method && getMethodBadge(proxyData.method)}
            {proxyData.status && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-bold text-white ${getStatusColor(proxyData.status)}`}>
                {proxyData.status}
              </span>
            )}
            <span className="text-sm max-w-[500px] flex-1 truncate">
              <span className="font-mono text-xs">
                {proxyData.host}{proxyData.url?.split(proxyData.host)?.[1] || proxyData.url}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            
            <span className="text-xs text-muted-foreground">
              {proxyData.server_bytes > 0 ? formatBytes(proxyData.server_bytes) : ''}
            </span>
          </div>
        </div>
      )}

      {log.type === 'connection' && (
        <>
          <Badge variant="secondary">CONN</Badge>
          <span className="text-sm font-mono text-xs">
            {(log.data as { host?: string; port?: number })?.host}:{(log.data as { host?: string; port?: number })?.port}
          </span>
        </>
      )}

      {log.type === 'connection-close' && (
        <Badge variant="outline">CLOSE</Badge>
      )}

      {expanded ? (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );

  const expandedContent = (
    <>
      {expanded && isProxyLog && proxyData && (
        <div className="px-4 py-3 bg-muted/30 border-t">
          <LogEntryTabs proxyData={proxyData} />
        </div>
      )}

      {expanded && !isProxyLog && (
        <div className="px-4 py-3 bg-muted/30 border-t">
          <pre className="text-xs font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(log.data, null, 2)}
          </pre>
        </div>
      )}
    </>
  );

  return (
    <div className="border-b">
      <LogEntryContextMenu log={log} onToggle={onToggle} activeTargetId={activeTargetId}>
        {rowContent}
      </LogEntryContextMenu>
      {expandedContent}
    </div>
  );
}