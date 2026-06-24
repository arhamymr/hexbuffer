import { invoke } from '@tauri-apps/api/core';

import {
  getHttpLogDetail,
  getHttpLogs,
  getProxyTree,
  getWebSocketDetail,
  getWebSocketLogs,
  type TreeNode,
} from '@/pages/live-traffic/api';
import type { PaginatedResponse, ProxyLogSummary, ProxyRecord } from '@/types';
import type {
  WebSocketConnectionDetail,
  WebSocketConnectionSummary,
  WebSocketFilter,
} from '@/pages/live-traffic/api';

import type { HistoryQuery } from '../state/build-history-query';

export async function fetchHistorySummaries(
  query: HistoryQuery
): Promise<PaginatedResponse<ProxyLogSummary>> {
  return getHttpLogs(query.page, query.perPage, query.filter, query.sortOrder);
}

export async function fetchHistoryTree(query: HistoryQuery): Promise<TreeNode[]> {
  return getProxyTree(query.filter);
}

export async function fetchHistoryDetail(logId: string): Promise<ProxyRecord> {
  return getHttpLogDetail(logId);
}

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

export async function clearHistoryLogs(): Promise<void> {
  await invoke('clear_proxy_all');
}

export async function deleteHistoryLog(logId: string): Promise<void> {
  await invoke('delete_proxy_by_id', { logId });
}

export async function deleteWebSocketConnection(connectionId: string): Promise<void> {
  await invoke('delete_websocket_by_id', { connectionId });
}
