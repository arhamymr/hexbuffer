import { ClipboardIcon } from '@phosphor-icons/react';
import { HighlightedText } from '@/components/highlighted-text';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { ActivityStatusBadge, LevelBadge, type StatusActivityValue } from '@/components/status-badge';
import { cn } from '@/lib/utils';
import { formatTimestamp } from './utils';

export interface EventLogRow {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  type: StatusActivityValue;
  message: string;
  url?: string;
}

interface EventLogTableProps<TLog extends EventLogRow> {
  logs: TLog[];
  onCopyLog?: (log: TLog) => void;
  onRowClick?: (log: TLog) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  searchQuery?: string;
}

export function EventLogTable<TLog extends EventLogRow>({
  logs,
  onRowClick,
  emptyTitle = 'No log entries',
  emptyDescription = 'Events will appear here once activity is available.',
  searchQuery = '',
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
        <thead className="sticky top-0 z-1 border-b bg-muted">
          <tr>
            <th className="w-[90px] px-3 py-1 text-left text-xs font-medium text-muted-foreground">
              Time
            </th>
            <th className="w-[90px] px-3 py-1 text-left text-xs font-medium text-muted-foreground">
              Level
            </th>
            <th className="w-[120px] px-3 py-1 text-left text-xs font-medium text-muted-foreground">
              TextTIcon
            </th>
            <th className="px-3 py-1 text-left text-xs font-medium text-muted-foreground">
              Message
            </th>
            <th className="w-[180px] px-3 py-1 text-left text-xs font-medium text-muted-foreground">
              URL
            </th>
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
                <LevelBadge level={log.level} />
              </td>
              <td className="px-3 py-1">
                <ActivityStatusBadge status={log.type} />
              </td>
              <td className="max-w-[520px] truncate px-3 py-1 text-xs" title={log.message}>
                <HighlightedText text={log.message} query={searchQuery} />
              </td>
              <td className="max-w-[220px] truncate px-3 py-1 text-xs text-muted-foreground" title={log.url}>
                <HighlightedText text={log.url || '-'} query={searchQuery} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
