'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { useWebSocketDetail } from '@/pages/http-history/hooks/use-websocket-detail';
import { InspectorSection, buildHeadersList } from '../log-table/inspector';
import { formatBytes } from '../log-table/utils';

interface WebSocketEntryViewProps {
  selectedConnectionId: string | null;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
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

export function WebSocketEntryView({ selectedConnectionId }: WebSocketEntryViewProps) {
  const { connection, messages, isLoading, loadError } = useWebSocketDetail(selectedConnectionId);

  if (!selectedConnectionId) {
    return (
      <div className="h-full flex items-center justify-center">
        <Empty>
          <EmptyTitle>No WebSocket connection selected</EmptyTitle>
          <EmptyDescription>Select a WebSocket connection to inspect its handshake and messages.</EmptyDescription>
        </Empty>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Empty>
          <EmptyTitle>Loading...</EmptyTitle>
        </Empty>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Failed to load WebSocket details</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="h-full flex items-center justify-center">
        <Empty>
          <EmptyTitle>WebSocket connection not found</EmptyTitle>
          <EmptyDescription>The selected connection could not be found.</EmptyDescription>
        </Empty>
      </div>
    );
  }

  return (
    <div className="h-full grid grid-cols-2 gap-0 min-h-0 p-1">
      <div className="border rounded-l-md border-r-0 overflow-hidden flex flex-col">
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <span className={`text-xs rounded border px-1.5 py-0.5 uppercase ${stateClassName(connection.state)}`}>
              {connection.state}
            </span>
            <span className="text-xs font-mono truncate flex-1" title={connection.url}>
              {connection.url}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDateTime(connection.timestamp)}</span>
            <span>{connection.client_addr || '-'} to {connection.server_addr || '-'}</span>
            {connection.handshake_response_status && <span>Status {connection.handshake_response_status}</span>}
          </div>
        </div>

        <div className="p-3 flex-1 overflow-auto">
          <InspectorSection title="Request Headers" items={buildHeadersList(connection.handshake_request_headers)} />
          <InspectorSection
            title="Response Headers"
            items={buildHeadersList(connection.handshake_response_headers)}
            defaultOpen={false}
          />
        </div>
      </div>

      <div className="border rounded-r-md overflow-hidden flex flex-col">
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold">Messages</div>
            <div className="text-xs text-muted-foreground">{messages.length} captured</div>
          </div>
        </div>

        <div className="p-3 flex-1 overflow-auto space-y-2">
          {messages.length === 0 ? (
            <div className="bg-background p-3 rounded-md border text-xs text-muted-foreground">
              No WebSocket messages captured for this connection.
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="rounded-md border bg-background">
                <div className="flex items-center gap-2 border-b px-3 py-2 text-xs">
                  <span
                    className={`rounded px-1.5 py-0.5 uppercase ${
                      message.direction === 'outbound'
                        ? 'bg-blue-500/10 text-blue-600'
                        : 'bg-green-500/10 text-green-600'
                    }`}
                  >
                    {message.direction}
                  </span>
                  <span className="uppercase text-muted-foreground">{message.type}</span>
                  <span className="text-muted-foreground">{formatBytes(message.size)}</span>
                  <span className="ml-auto font-mono text-muted-foreground">{formatDateTime(message.timestamp)}</span>
                </div>
                <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-words max-h-48 overflow-auto">
                  {message.payload || '(empty payload)'}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
