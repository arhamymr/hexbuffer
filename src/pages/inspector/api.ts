import { invoke } from '@tauri-apps/api/core';

export async function openInspectorBrowser(
  proxyPort: number,
  debuggingPort: number
): Promise<void> {
  await invoke('open_inspector_browser', { proxyPort, debuggingPort });
}

export async function connectInspectorCdp(debuggingPort: number): Promise<void> {
  await invoke('connect_inspector_cdp', { debuggingPort });
}

export async function disconnectInspectorCdp(): Promise<void> {
  await invoke('disconnect_inspector_cdp');
}
