import {
  getWebSocketDetail,
  getWebSocketLogs,
  deleteWebSocket,
} from '../api';
import type { PaginatedResponse } from '@/types';
import type {
  WebSocketConnectionDetail,
  WebSocketConnectionSummary,
  WebSocketFilter,
} from '../api';
import { invoke } from '@tauri-apps/api/core';

export async function fetchWebSocketSummaries(query: {
  page: number;
  perPage: number;
  filter: WebSocketFilter;
}): Promise<PaginatedResponse<WebSocketConnectionSummary>> {
  return getWebSocketLogs(query.page, query.perPage, query.filter);
}

export async function fetchWebSocketDetail(connectionId: string): Promise<WebSocketConnectionDetail> {
  return getWebSocketDetail(connectionId);
}

export async function deleteWebSocketConnection(connectionId: string): Promise<void> {
  await deleteWebSocket(connectionId);
}

export async function clearWebSocketLogs(): Promise<void> {
  await invoke('clear_websocket_all');
}
