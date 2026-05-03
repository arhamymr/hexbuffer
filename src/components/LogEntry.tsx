'use client';

import { ChevronRight, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ApiCall } from '@/types';
import { formatTimestamp, getMethodBadge, getStatusColor, formatBytes } from './constants';
import { LogEntryTabs } from './LogEntryTabs';
import { LogEntryContextMenu } from './LogEntryContextMenu';

interface LogEntryProps {
  call: ApiCall;
  expanded: boolean;
  onToggle: () => void;
  activeTargetId?: string | null;
}

export function LogEntry({ call, expanded, onToggle, activeTargetId }: LogEntryProps) {
  return (
    <div className="border-b">
      <LogEntryContextMenu call={call} onToggle={onToggle} activeTargetId={activeTargetId}>
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 cursor-pointer"
          onClick={onToggle}
        >
          <span className="text-xs text-muted-foreground font-mono w-28 flex-shrink-0">
            {formatTimestamp(call.timestamp)}
          </span>

          <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {call.method && getMethodBadge(call.method)}
              {call.response_status && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-mono font-bold text-white ${getStatusColor(call.response_status)}`}
                >
                  {call.response_status}
                </span>
              )}
              <span className="text-sm max-w-[500px] flex-1 truncate">
                <span className="font-mono text-xs">
                  {call.host}{call.path}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {call.response_body_size > 0 ? formatBytes(call.response_body_size) : ''}
              </span>
            </div>
          </div>

          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </LogEntryContextMenu>

      {expanded && (
        <div className="px-4 py-3 bg-muted/30 border-t">
          <LogEntryTabs call={call} />
        </div>
      )}
    </div>
  );
}