import { invoke } from '@tauri-apps/api/core';
import type { Target } from './types';

export async function openInspectorBrowser(
  proxyPort: number,
  debuggingPort: number,
  profilePath?: string
): Promise<void> {
  await invoke('open_cdp_browser', { port: debuggingPort });
}

export async function getInspectorPages(debuggingPort: number): Promise<Target[]> {
  const resp = await invoke<string>('get_cdp_targets', { port: debuggingPort });
  try {
    return JSON.parse(resp) as Target[];
  } catch {
    return [];
  }
}

