import {
  getHttpLogDetail,
  getHttpLogs,
} from '../api';
import type { PaginatedResponse, ProxyLogSummary, ProxyRecord } from '@/types';
import type { HistoryQuery } from '../state/build-history-query';
import { invoke } from '@tauri-apps/api/core';

export async function fetchHistorySummaries(
  query: HistoryQuery
): Promise<PaginatedResponse<ProxyLogSummary>> {
  return getHttpLogs(query.page, query.perPage, query.filter, query.sortOrder);
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
