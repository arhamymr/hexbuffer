'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { useWebSocketTable } from '@/pages/http-history/hooks/use-websocket-table';

interface WebSocketTableProps {
  selectedConnectionId: string | null;
  onSelectConnection: (id: string) => void;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function stateClassName(state: string) {
  switch (state.toLowerCase()) {
    case 'open':
      return 'bg-green-500/10 text-green-600 border-green-500/30';
    case 'error':
      return 'bg-red-500/10 text-red-600 border-red-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function WebSocketTable({ selectedConnectionId, onSelectConnection }: WebSocketTableProps) {
  const {
    connections,
    pagination,
    isLoading,
    isLoadingMore,
    newEventsCount,
    loadError,
    hasActiveFilters,
    loadMore,
    handleRefresh,
  } = useWebSocketTable();
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.perPage));

  if (loadError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Failed to load WebSocket history</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isLoading && connections.length === 0) {
    return (
      <Empty>
        <EmptyTitle>{hasActiveFilters ? 'No matching WebSocket connections' : 'No WebSocket connections yet'}</EmptyTitle>
        <EmptyDescription>
          {hasActiveFilters
            ? 'Try clearing the active search or scope filters.'
            : 'Captured WebSocket connections will appear here once they pass through the proxy.'}
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="overflow-auto h-full flex flex-col">
      {newEventsCount > 0 && (
        <div className="flex items-center justify-center py-2 border-b bg-muted/50">
          <Button variant="outline" size="xs" onClick={handleRefresh}>
            {newEventsCount} new connection{newEventsCount > 1 ? 's' : ''} - Click to refresh
          </Button>
        </div>
      )}
      <table className="w-full">
        <thead className="sticky top-0 backdrop-blur z-10 border-b">
          <tr>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2 w-[90px]">Time</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Host</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Path</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">State</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2">Messages</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Last Activity</th>
          </tr>
        </thead>
        <tbody>
          {connections.map((connection) => (
            <tr
              key={connection.id}
              className={`border-b cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedConnectionId === connection.id ? 'bg-muted/60' : ''
              }`}
              onClick={() => onSelectConnection(connection.id)}
            >
              <td className="text-xs font-mono text-muted-foreground px-3 py-2">
                {formatDateTime(connection.timestamp)}
              </td>
              <td className="text-xs px-3 py-2 truncate max-w-[180px]" title={connection.url}>
                {connection.host}
              </td>
              <td className="text-xs text-muted-foreground px-3 py-2 truncate max-w-[320px]" title={connection.url}>
                {connection.path}
              </td>
              <td className="text-xs px-3 py-2">
                <span className={`inline-flex items-center rounded border px-1.5 py-0.5 uppercase ${stateClassName(connection.state)}`}>
                  {connection.state}
                </span>
              </td>
              <td className="text-xs text-right px-3 py-2">{connection.messageCount}</td>
              <td className="text-xs text-muted-foreground px-3 py-2">{formatDateTime(connection.lastActivityAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between gap-3 px-3 py-4 border-t">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Showing {connections.length} of {pagination.total} connection{pagination.total === 1 ? '' : 's'}
          </span>
          <span>
            {pagination.page}/{totalPages} page
          </span>
        </div>
        <Button
          size="xs"
          variant="outline"
          onClick={loadMore}
          disabled={!pagination.hasMore || isLoadingMore}
        >
          {isLoadingMore ? 'Loading...' : 'Load More'}
        </Button>
      </div>
    </div>
  );
}
