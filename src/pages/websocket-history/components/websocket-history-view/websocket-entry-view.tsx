import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useWebSocketDetail } from '@/pages/websocket-history/hooks/use-websocket-detail';
import { InspectorSection, buildHeadersList } from '@/pages/http-history/components/log-table/inspector';
import { WebSocketMessageCard } from './websocket-message-card';

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
  const {
    connection,
    messages,
    filteredMessages,
    isLoading,
    loadError,
    searchQuery,
    setSearchQuery,
    directionFilter,
    setDirectionFilter,
    hideHeartbeats,
    setHideHeartbeats,
  } = useWebSocketDetail(selectedConnectionId);

  const [autoScroll, setAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll logic (ponytail: keep scroll-to-bottom clean and conditional)
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [filteredMessages.length, autoScroll]);

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
        <div className="p-3 border-b bg-muted/30 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold">Messages</div>
            <div className="text-xs text-muted-foreground">
              {filteredMessages.length !== messages.length
                ? `${filteredMessages.length} of ${messages.length} shown`
                : `${messages.length} captured`}
            </div>
          </div>

          {/* Messages Toolbar Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* MagnifyingGlassIcon Input */}
            <div className="relative flex-1 min-w-[120px]">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <Input
                type="text"
                placeholder="MagnifyingGlassIcon messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-2 h-7 text-xs bg-background"
              />
            </div>

            {/* Direction FunnelIcon Toggles */}
            <div className="flex items-center border rounded h-7 overflow-hidden bg-background divide-x">
              <button
                type="button"
                onClick={() => setDirectionFilter('all')}
                className={`px-2 py-0.5 text-[10px] uppercase font-semibold transition-colors ${
                  directionFilter === 'all' ? 'bg-muted' : 'hover:bg-muted/45'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setDirectionFilter('outbound')}
                className={`px-2 py-0.5 text-[10px] uppercase font-semibold transition-colors ${
                  directionFilter === 'outbound' ? 'bg-muted text-blue-600 dark:text-blue-400' : 'hover:bg-muted/45'
                }`}
              >
                Out
              </button>
              <button
                type="button"
                onClick={() => setDirectionFilter('inbound')}
                className={`px-2 py-0.5 text-[10px] uppercase font-semibold transition-colors ${
                  directionFilter === 'inbound' ? 'bg-muted text-green-600 dark:text-green-400' : 'hover:bg-muted/45'
                }`}
              >
                In
              </button>
            </div>

            {/* Hide Heartbeats Checkbox */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Checkbox
                id="hide-heartbeats"
                checked={hideHeartbeats}
                onCheckedChange={(checked) => setHideHeartbeats(!!checked)}
                className="size-3.5"
              />
              <label htmlFor="hide-heartbeats" className="text-[10px] text-muted-foreground select-none cursor-pointer">
                Hide heartbeats
              </label>
            </div>

            {/* Auto Scroll Checkbox */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Checkbox
                id="auto-scroll"
                checked={autoScroll}
                onCheckedChange={(checked) => setAutoScroll(!!checked)}
                className="size-3.5"
              />
              <label htmlFor="auto-scroll" className="text-[10px] text-muted-foreground select-none cursor-pointer">
                Auto-scroll
              </label>
            </div>
          </div>
        </div>

        <div ref={scrollContainerRef} className="p-3 flex-1 overflow-auto space-y-2">
          {filteredMessages.length === 0 ? (
            <div className="bg-background p-3 rounded-md border text-xs text-muted-foreground">
              {messages.length === 0
                ? 'No WebSocket messages captured for this connection.'
                : 'No messages match active filters.'}
            </div>
          ) : (
            filteredMessages.map((message) => (
              <WebSocketMessageCard
                key={message.id}
                message={message}
                formatDateTime={formatDateTime}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
