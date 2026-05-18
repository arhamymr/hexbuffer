import { invoke } from '@tauri-apps/api/core';

import {
  getHttpLogDetail,
  getHttpLogs,
  getProxyTree,
  type TreeNode,
} from '@/pages/http-history/api';
import type { PaginatedResponse, ProxyLogSummary, ProxyRecord } from '@/types';

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

export async function clearHistoryLogs(): Promise<void> {
  await invoke('clear_proxy_all');
}

export async function deleteHistoryLog(logId: string): Promise<void> {
  await invoke('delete_proxy_by_id', { logId });
}
