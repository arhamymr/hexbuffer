import { invoke } from '@tauri-apps/api/core';
import type { HttpRequestMessage, HttpResponseMessage } from '@/lib/http-message';

export async function forwardRequest(
  requestId: string,
  request?: HttpRequestMessage | null,
  interceptResponse?: boolean,
): Promise<void> {
  await invoke('forward_intercepted_request', {
    requestId,
    request: request ?? null,
    interceptResponse: interceptResponse ?? false,
  });
}

export async function forwardResponse(
  requestId: string,
  response: HttpResponseMessage,
): Promise<void> {
  await invoke('forward_intercepted_response', { requestId, response });
}

export async function dropRequest(requestId: string): Promise<void> {
  await invoke('drop_intercepted_request', { requestId });
}

export async function forwardTab(tabId: string): Promise<void> {
  await invoke('forward_intercepted_tab', { tabId });
}
