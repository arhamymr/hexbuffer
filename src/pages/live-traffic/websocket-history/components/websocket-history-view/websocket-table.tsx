import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { HighlightedText } from '@/components/highlighted-text';
import { useWebSocketTable } from '../../hooks/use-websocket-table';
import { HistoryLoadingState } from '@/pages/live-traffic/components/history-loading-state';
import { TrafficTablePagination } from '@/pages/live-traffic/components/traffic-table-pagination';
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
    newEventsCount,
    loadError,
    searchQuery,
    hasActiveFilters,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    handleRefresh,
    removeConnectionLocally,
  } = useWebSocketTable();

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
    return <HistoryLoadingState label="Loading WebSocket history..." columns={5} />;
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

  const showingStart = connections.length > 0 ? (pagination.page - 1) * pagination.perPage + 1 : 0;
  const showingEnd = Math.min(pagination.page * pagination.perPage, pagination.total);

  return (
    <div className="h-full flex flex-col min-w-0 overflow-hidden">
      {newEventsCount > 0 && (
        <div className="flex items-center justify-center py-1 border-b bg-muted/50 shrink-0">
          <Button variant="outline" size="xs" onClick={handleRefresh}>
            {newEventsCount} new connection{newEventsCount > 1 ? 's' : ''} - Click to refresh
          </Button>
        </div>
      )}
      <div className="flex-1 overflow-auto min-w-0">
        <table className="w-full">
          <thead className="sticky top-0 z-10 border-b bg-muted/40 text-xs font-semibold text-muted-foreground select-none">
            <tr>
              <th className="text-left uppercase tracking-wider text-[10px] px-3 py-1.5 w-[90px]">Time</th>
              <th className="text-left uppercase tracking-wider text-[10px] px-3 py-1.5 w-[180px]">Host</th>
              <th className="text-left uppercase tracking-wider text-[10px] px-3 py-1.5 flex-1">Path</th>
              <th className="text-right uppercase tracking-wider text-[10px] px-3 py-1.5 w-[70px]">Messages</th>
              <th className="text-left uppercase tracking-wider text-[10px] px-3 py-1.5 w-[90px]">Pulse</th>
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
      </div>

      <TrafficTablePagination
        showingStart={showingStart}
        showingEnd={showingEnd}
        total={pagination.total}
        page={pagination.page}
        totalPages={totalPages}
        hasPreviousPage={hasPreviousPage}
        hasNextPage={hasNextPage}
        isLoading={isLoading}
        onPreviousPage={goToPreviousPage}
        onNextPage={goToNextPage}
      />
    </div>
  );
}
