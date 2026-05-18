'use client';

import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { useWebSocketDetail } from '@/pages/http-history/hooks/use-websocket-detail';

export function WebSocketEntryView() {
  const { selectedConnectionId } = useWebSocketDetail();

  return (
    <div className="h-full flex items-center justify-center">
      <Empty>
        <EmptyTitle>{selectedConnectionId ? 'WebSocket details coming soon' : 'No WebSocket connection selected'}</EmptyTitle>
        <EmptyDescription>
          {selectedConnectionId
            ? 'Message timeline and connection details will render here once websocket history is wired.'
            : 'Select a WebSocket connection to inspect its handshake and messages.'}
        </EmptyDescription>
      </Empty>
    </div>
  );
}
