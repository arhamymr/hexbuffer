import { useEffect, useMemo, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

import type {
  WebSocketConnectionRecord,
  WebSocketMessageRecord,
} from '../api';

import { fetchWebSocketDetail } from '../services/history-service';

export interface WebSocketMessage {
  id: string;
  connectionId: string;
  timestamp: string;
  direction: 'inbound' | 'outbound';
  type: string;
  size: number;
  payload: string;
  rawPayload?: number[];
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
    rawPayload: message.payload,
  };
}

export function useWebSocketDetail(selectedConnectionId: string | null) {
  const [connection, setConnection] = useState<WebSocketConnectionRecord | null>(null);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [hideHeartbeats, setHideHeartbeats] = useState(false);

  const selectedConnectionIdRef = useRef(selectedConnectionId);
  selectedConnectionIdRef.current = selectedConnectionId;

  // Reset filters when changing connection (ponytail: keep filter state synchronized with the active item)
  useEffect(() => {
    setSearchQuery('');
    setDirectionFilter('all');
    setHideHeartbeats(false);
  }, [selectedConnectionId]);

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

  useEffect(() => {
    const unlisten = listen<WebSocketMessageRecord>(
      'websocket-message',
      (event) => {
        const record = event.payload;
        if (
          !selectedConnectionIdRef.current ||
          record.connection_id !== selectedConnectionIdRef.current
        ) {
          return;
        }
        setMessages((prev) => [...prev, adaptMessage(record)]);
      }
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      // 1. Direction Funnel
      if (directionFilter !== 'all' && msg.direction !== directionFilter) {
        return false;
      }

      // 2. Hide Heartbeats (pings/pongs)
      if (hideHeartbeats) {
        const lowerType = msg.type.toLowerCase();
        if (lowerType === 'ping' || lowerType === 'pong') {
          return false;
        }
        const trimmedPayload = msg.payload.toLowerCase().trim();
        if (
          trimmedPayload === 'ping' ||
          trimmedPayload === 'pong' ||
          trimmedPayload === '{"type":"ping"}' ||
          trimmedPayload === '{"type":"pong"}' ||
          trimmedPayload === '{"event":"ping"}' ||
          trimmedPayload === '{"event":"pong"}' ||
          trimmedPayload === '{"op":"ping"}' ||
          trimmedPayload === '{"op":"pong"}' ||
          trimmedPayload === '{"heartbeat":true}'
        ) {
          return false;
        }
      }

      // 3. MagnifyingGlass query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return msg.payload.toLowerCase().includes(query);
      }

      return true;
    });
  }, [messages, directionFilter, hideHeartbeats, searchQuery]);

  return useMemo(
    () => ({
      selectedConnectionId,
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
    }),
    [
      connection,
      isLoading,
      loadError,
      messages,
      filteredMessages,
      selectedConnectionId,
      searchQuery,
      directionFilter,
      hideHeartbeats,
    ]
  );
}
