'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { useWebSocketTable } from '@/pages/http-history/hooks/use-websocket-table';

export function WebSocketTable() {
  const { connections, isLoading, loadError, hasActiveFilters } = useWebSocketTable();

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
            : 'Captured WebSocket connections will appear here once websocket logging is added.'}
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full">
        <thead className="sticky top-0 backdrop-blur z-10 border-b">
          <tr>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Host</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Path</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">State</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-3 py-2">Messages</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Last Activity</th>
          </tr>
        </thead>
        <tbody>
          {connections.map((connection) => (
            <tr key={connection.id} className="border-b">
              <td className="text-xs px-3 py-2">{connection.host}</td>
              <td className="text-xs text-muted-foreground px-3 py-2">{connection.path}</td>
              <td className="text-xs px-3 py-2 uppercase">{connection.state}</td>
              <td className="text-xs text-right px-3 py-2">{connection.messageCount}</td>
              <td className="text-xs text-muted-foreground px-3 py-2">{connection.lastActivityAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
