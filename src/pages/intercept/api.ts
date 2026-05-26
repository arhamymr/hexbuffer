import { invoke } from '@tauri-apps/api/core';
import type { HttpRequestMessage } from '@/lib/http-message';
import type { InterceptStatus, PausedRequest } from './types';

export async function getInterceptStatus(): Promise<InterceptStatus> {
  return invoke<InterceptStatus>('get_intercept_status');
}

export async function setInterceptEnabled(enabled: boolean): Promise<InterceptStatus> {
  return invoke<InterceptStatus>('set_intercept_enabled', { enabled });
}

export async function getPausedRequests(): Promise<PausedRequest[]> {
  return invoke<PausedRequest[]>('get_paused_requests');
}

export async function forwardInterceptedRequest(
  requestId: string,
  request: HttpRequestMessage
): Promise<void> {
  await invoke('forward_intercepted_request', { requestId, request });
}

export async function dropInterceptedRequest(requestId: string): Promise<void> {
  await invoke('drop_intercepted_request', { requestId });
}

export async function openInterceptBrowser(): Promise<void> {
  await invoke('open_intercept_browser');
}

export async function trustInterceptCa(): Promise<string> {
  return invoke<string>('trust_intercept_ca');
}
