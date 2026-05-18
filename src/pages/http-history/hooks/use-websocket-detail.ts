import { useState } from 'react';

export interface WebSocketMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'binary';
  size: number;
  timestamp: string;
  payloadPreview: string;
}

export function useWebSocketDetail() {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  return {
    selectedConnectionId,
    setSelectedConnectionId,
    connection: null,
    messages: [] as WebSocketMessage[],
    isLoading: false,
    loadError: null as string | null,
  };
}
