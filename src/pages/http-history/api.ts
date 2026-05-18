import { invoke } from '@tauri-apps/api/core';
import type { ProxyRecord, ProxyLogSummary, PaginatedResponse } from '@/types';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (typeof window !== 'undefined' && !window.__TAURI_INTERNALS__) {
    throw new Error('Tauri backend is unavailable. Start the desktop app with `pnpm tauri`, not `pnpm dev`.');
  }

  return invoke<T>(command, args);
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

export async function getHttpLogs(
  page: number,
  perPage: number = 100,
  filter?: ProxyFilter,
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<PaginatedResponse<ProxyLogSummary>> {
  return invokeTauri('get_proxy_paginated', {
    page,
    per_page: perPage,
    filter,
    sort_order: sortOrder,
  });
}

export async function getHttpLogDetail(logId: string): Promise<ProxyRecord> {
  return invokeTauri('get_proxy_detail', {
    log_id: logId,
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
  count: number;
  methods: string[];
}

export async function getProxyTree(filter?: ProxyFilter): Promise<TreeNode[]> {
  return invokeTauri('get_proxy_tree', { filter });
}
