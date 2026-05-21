import { useEffect, useMemo, useState } from 'react';

import type {
  WebSocketConnectionRecord,
  WebSocketMessageRecord,
} from '@/pages/http-history/api';

import { fetchWebSocketDetail } from '../services/history-service';

export interface WebSocketMessage {
  id: string;
  connectionId: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  type: string;
  size: number;
  payload: string;
}

function normalizeLower(value: string): string {
  return value.toLowerCase();
}

function decodePayload(payload: number[], type: string): string {
  if (payload.length === 0) {
    return '';
  }

  if (normalizeLower(type) !== 'text') {
    return payload.map((byte) => byte.toString(16).padStart(2, '0')).join(' ');
  }

  try {
    return new TextDecoder().decode(new Uint8Array(payload));
  } catch {
    return '';
  }
}

function adaptMessage(message: WebSocketMessageRecord): WebSocketMessage {
  const type = normalizeLower(message.message_type);

  return {
    id: message.id,
    connectionId: message.connection_id,
    timestamp: message.timestamp,
    direction: normalizeLower(message.direction) === 'outbound' ? 'outbound' : 'inbound',
    type,
    size: message.payload_size,
    payload: decodePayload(message.payload, type),
  };
}

export function useWebSocketDetail(selectedConnectionId: string | null) {
  const [connection, setConnection] = useState<WebSocketConnectionRecord | null>(null);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedConnectionId) {
      setConnection(null);
      setMessages([]);
      setLoadError(null);
      return;
    }

    let isCurrent = true;

    const fetchDetail = async () => {
      setIsLoading(true);

      try {
        setLoadError(null);
        const result = await fetchWebSocketDetail(selectedConnectionId);
        if (!isCurrent) return;

        setConnection(result.connection);
        setMessages(result.messages.map(adaptMessage));
      } catch (error) {
        console.error('Failed to fetch WebSocket connection:', error);
        if (!isCurrent) return;

        setLoadError(error instanceof Error ? error.message : 'Failed to load WebSocket details.');
        setConnection(null);
        setMessages([]);
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    fetchDetail();

    return () => {
      isCurrent = false;
    };
  }, [selectedConnectionId]);

  return useMemo(
    () => ({
      selectedConnectionId,
      connection,
      messages,
      isLoading,
      loadError,
    }),
    [connection, isLoading, loadError, messages, selectedConnectionId]
  );
}
