import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { HighlightedText } from '@/components/highlighted-text';
import { useWebSocketTable } from '@/pages/websocket-history/hooks/use-websocket-table';
import { HistoryLoadingState } from '../history-loading-state';
import { WebSocketContextMenu } from './websocket-context-menu';

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


export function WebSocketTable({ selectedConnectionId, onSelectConnection }: WebSocketTableProps) {
  const {
    connections,
    pagination,
    isLoading,
    isLoadingMore,
    newEventsCount,
    loadError,
    searchQuery,
    hasActiveFilters,
    loadMore,
    handleRefresh,
    removeConnectionLocally,
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

  if (isLoading && connections.length === 0) {
    return <HistoryLoadingState label="Loading WebSocket history..." columns={7} />;
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
        <div className="flex items-center justify-center py-1 border-b bg-muted/50">
          <Button variant="outline" onClick={handleRefresh}>
            {newEventsCount} new connection{newEventsCount > 1 ? 's' : ''} - Click to refresh
          </Button>
        </div>
      )}
      <table className="w-full">
        <thead className="sticky top-0 z-10 border-b bg-muted">
          <tr>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-1 w-[90px]">Time</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-1 w-[150px]">Host</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-1 flex-1">Path</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-3 py-1 w-[70px]">Messages</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-1 w-[80px]">Pulse</th>
          </tr>
        </thead>
        <tbody>
          {connections.map((connection) => (
            <WebSocketContextMenu
              key={connection.id}
              connectionId={connection.id}
              connectionUrl={connection.url}
              connectionHost={connection.host}
              connectionPath={connection.path}
              onDelete={removeConnectionLocally}
            >
              <tr
                className={`font-mono transition-colors border-b cursor-pointer hover:bg-muted/50 ${
                  selectedConnectionId === connection.id ? ' hover:!bg-muted bg-muted' : ''
                }`}
                onClick={() => onSelectConnection(connection.id)}
              >
                <td className="text-xs text-muted-foreground px-3 py-1">
                  {formatDateTime(connection.timestamp)}
                </td>
                <td className="text-xs truncate max-w-[250px] px-3 py-1" title={connection.url}>
                  <HighlightedText text={connection.host} query={searchQuery} />
                </td>
                <td className="text-xs text-muted-foreground truncate max-w-[200px] px-3 py-1" title={connection.url}>
                  <HighlightedText text={connection.path} query={searchQuery} />
                </td>
                <td className="text-xs text-right px-3 py-1">{connection.messageCount}</td>
                <td className="text-xs text-muted-foreground px-3 py-1">{formatDateTime(connection.lastActivityAt)}</td>
              </tr>
            </WebSocketContextMenu>
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
