import { invoke } from '@tauri-apps/api/core';
import type { PaginatedResponse } from '@/types';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  if (error && typeof error === 'object') {
    const maybeMessage = 'message' in error ? error.message : undefined;
    if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (typeof window !== 'undefined' && !window.__TAURI_INTERNALS__) {
    throw new Error('Tauri backend is unavailable. Start the desktop app with `pnpm tauri`, not `pnpm dev`.');
  }

  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw new Error(toErrorMessage(error, `Failed to run Tauri command: ${command}`));
  }
}

export interface WebSocketFilter {
  search: string | null;
  scope: string[] | null;
  states?: string[] | null;
}

export interface WebSocketConnectionSummary {
  id: string;
  timestamp: string;
  url: string;
  host: string;
  path: string;
  direction: string;
  state: string;
  message_count: number;
  last_activity_at: string;
}

export interface WebSocketConnectionRecord {
  id: string;
  timestamp: string;
  url: string;
  host: string;
  path: string;
  handshake_request_headers: Record<string, string>;
  handshake_response_status: number | null;
  handshake_response_headers: Record<string, string>;
  client_addr: string;
  server_addr: string;
  state: string;
  message_count: number;
  last_activity_at: string;
}

export interface WebSocketMessageRecord {
  id: string;
  connection_id: string;
  timestamp: string;
  direction: string;
  message_type: string;
  payload: number[];
  payload_size: number;
}

export interface WebSocketConnectionDetail {
  connection: WebSocketConnectionRecord;
  messages: WebSocketMessageRecord[];
}

export async function getWebSocketLogs(
  page: number,
  perPage: number = 60,
  filter?: WebSocketFilter
): Promise<PaginatedResponse<WebSocketConnectionSummary>> {
  return invokeTauri('get_websocket_paginated', {
    page,
    perPage,
    filter,
  });
}

export async function getWebSocketDetail(connectionId: string): Promise<WebSocketConnectionDetail> {
  return invokeTauri('get_websocket_detail', {
    connectionId,
  });
}

export async function deleteWebSocket(connectionId: string): Promise<void> {
  await invokeTauri('delete_websocket_by_id', { connectionId });
}
