import { invoke } from '@tauri-apps/api/core';
import type { ProxyRecord, ProxyLogSummary, PaginatedResponse } from '@/types';

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

export interface Target {
  id: string;
  name: string;
  description: string;
  scope: string[];
  createdAt: string;
  updatedAt: string;
}

export async function getTargets(): Promise<Target[]> {
  return [];
}

export async function createTarget(name: string, scope: string[]): Promise<Target> {
  return { id: '1', name, description: '', scope, createdAt: '', updatedAt: '' };
}

export async function deleteTarget(id: string): Promise<boolean> {
  return true;
}

export interface ProxyFilter {
  search: string | null;
  path: string | null;
  methods: string[] | null;
  status_codes: number[] | null;
  scope: string[] | null;
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

export async function getHttpLogs(
  page: number,
  perPage: number = 100,
  filter?: ProxyFilter,
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<PaginatedResponse<ProxyLogSummary>> {
  return invokeTauri('get_proxy_paginated', {
    page,
    perPage,
    filter,
    sortOrder,
  });
}

export async function getHttpLogDetail(logId: string): Promise<ProxyRecord> {
  return invokeTauri('get_proxy_detail', {
    logId,
  });
}

export async function getCaCert(): Promise<string> {
  return invokeTauri<string>('get_ca_cert');
}

export async function saveCaCert(path: string, content: string): Promise<void> {
  return invokeTauri('save_ca_cert', { path, content });
}

export interface TreeNode {
  host: string;
  paths: TreePath[];
}

export interface TreePath {
  path: string;
  url?: string;
  count: number;
  methods: string[];
}

export async function getProxyTree(filter?: ProxyFilter): Promise<TreeNode[]> {
  return invokeTauri('get_proxy_tree', { filter });
}

export async function getWebSocketLogs(
  page: number,
  perPage: number = 100,
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
