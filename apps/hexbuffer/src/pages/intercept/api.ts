import { invoke } from '@tauri-apps/api/core';
import type { InterceptStatus, PausedRequest } from './types';

export async function getInterceptStatus(): Promise<InterceptStatus> {
  return invoke<InterceptStatus>('get_intercept_status');
}

export async function setInterceptScope(tabId: string, capturePatterns: string[]): Promise<void> {
  await invoke('set_intercept_scope', { tabId, capturePatterns });
}

export async function getPausedRequests(): Promise<PausedRequest[]> {
  return invoke<PausedRequest[]>('get_paused_requests');
}

export async function getInterceptBypassPatterns(): Promise<string[]> {
  return invoke<string[]>('get_intercept_bypass_patterns');
}

export async function setInterceptBypassPatterns(patterns: string[]): Promise<string[]> {
  return invoke<string[]>('set_intercept_bypass_patterns', { patterns });
}

export async function addInterceptBypassPattern(pattern: string): Promise<string[]> {
  return invoke<string[]>('add_intercept_bypass_pattern', { pattern });
}

export async function removeInterceptBypassPattern(pattern: string): Promise<string[]> {
  return invoke<string[]>('remove_intercept_bypass_pattern', { pattern });
}
