'use client';

import { Clipboard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { cn } from '@/lib/utils';
import { formatTimestamp } from './utils';

export interface EventLogRow {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  type: string;
  message: string;
  url?: string;
}

interface EventLogTableProps<TLog extends EventLogRow> {
  logs: TLog[];
  onCopyLog?: (log: TLog) => void;
  onRowClick?: (log: TLog) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const levelStyles: Record<EventLogRow['level'], string> = {
  info: 'border-sky-500/25 text-sky-700 dark:text-sky-300',
  warning: 'border-amber-500/25 text-amber-700 dark:text-amber-300',
  error: 'border-red-500/25 text-red-700 dark:text-red-300',
};

export function EventLogTable<TLog extends EventLogRow>({
  logs,
  onCopyLog,
  onRowClick,
  emptyTitle = 'No log entries',
  emptyDescription = 'Events will appear here once activity is available.',
}: EventLogTableProps<TLog>) {
  if (logs.length === 0) {
    return (
      <Empty>
        <EmptyTitle>{emptyTitle}</EmptyTitle>
        <EmptyDescription>{emptyDescription}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 z-10 border-b bg-muted">
          <tr>
            <th className="w-[90px] px-3 py-1 text-left text-xs font-medium text-muted-foreground">
              Time
            </th>
            <th className="w-[90px] px-3 py-1 text-left text-xs font-medium text-muted-foreground">
              Level
            </th>
            <th className="w-[120px] px-3 py-1 text-left text-xs font-medium text-muted-foreground">
              Type
            </th>
            <th className="px-3 py-1 text-left text-xs font-medium text-muted-foreground">
              Message
            </th>
            <th className="w-[180px] px-3 py-1 text-left text-xs font-medium text-muted-foreground">
              URL
            </th>
            {onCopyLog && (
              <th className="w-[64px] px-3 py-1 text-center text-xs font-medium text-muted-foreground">
                Action
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr
              key={log.id}
              className={cn(
                'border-b font-mono transition-colors hover:bg-muted/50',
                onRowClick ? 'cursor-pointer' : 'cursor-default',
              )}
              onClick={onRowClick ? () => onRowClick(log) : undefined}
            >
              <td className="whitespace-nowrap px-3 py-1 text-xs text-muted-foreground">
                {formatTimestamp(log.timestamp)}
              </td>
              <td className="px-3 py-1">
                <Badge variant="outline" className={cn('h-5 px-1.5 text-[10px] capitalize', levelStyles[log.level])}>
                  {log.level}
                </Badge>
              </td>
              <td className="px-3 py-1">
                <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                  {log.type}
                </Badge>
              </td>
              <td className="max-w-[520px] truncate px-3 py-1 text-xs" title={log.message}>
                {log.message}
              </td>
              <td className="max-w-[220px] truncate px-3 py-1 text-xs text-muted-foreground" title={log.url}>
                {log.url || '-'}
              </td>
              {onCopyLog && (
                <td className="px-3 py-1 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyLog(log);
                    }}
                    title="Copy log line"
                  >
                    <Clipboard className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
