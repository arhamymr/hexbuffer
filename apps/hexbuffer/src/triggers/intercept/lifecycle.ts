import { invoke } from '@tauri-apps/api/core';
import type { InterceptStatus } from '@/pages/intercept/types';

export async function toggleIntercept(enabled: boolean): Promise<InterceptStatus> {
  return invoke<InterceptStatus>('set_intercept_enabled', { enabled });
}

export async function openBrowser(proxyPort?: number): Promise<void> {
  await invoke('open_intercept_browser', { proxyPort: proxyPort ?? 8888 });
}

export async function trustCA(): Promise<string> {
  return invoke<string>('trust_intercept_ca');
}
