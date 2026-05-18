import { invoke } from '@tauri-apps/api/core';
import type { ProxyRecord, PaginatedResponse } from '@/types';

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
  methods: string[] | null;
  status_codes: number[] | null;
  scope: string[] | null;
}

export async function getHttpLogs(
  page: number,
  perPage: number = 100,
  filter?: ProxyFilter,
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<PaginatedResponse<ProxyRecord>> {
  return invoke('get_proxy_paginated', {
    page,
    per_page: perPage,
    filter,
    sort_order: sortOrder,
  });
}

export async function getCaCert(): Promise<string> {
  return invoke<string>('get_ca_cert');
}

export async function saveCaCert(path: string, content: string): Promise<void> {
  return invoke('save_ca_cert', { path, content });
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
  return invoke('get_proxy_tree', { filter });
}