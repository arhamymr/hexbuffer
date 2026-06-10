import { invoke } from '@tauri-apps/api/core';

export async function openInspectorBrowser(
  proxyPort: number,
  debuggingPort: number,
  profilePath?: string
): Promise<string> {
  return await invoke('open_inspector_browser', { proxyPort, debuggingPort, profilePath: profilePath ?? null });
}

export async function connectInspectorCdp(debuggingPort: number): Promise<void> {
  await invoke('connect_inspector_cdp', { debuggingPort });
}

export async function disconnectInspectorCdp(): Promise<void> {
  await invoke('disconnect_inspector_cdp');
}

export async function getInspectorPages(debuggingPort: number): Promise<
  Array<{ id: string; url: string; title: string }>
> {
  return await invoke('get_inspector_pages', { debuggingPort });
}

export async function getInspectorCookies(debuggingPort: number, pageId?: string | null): Promise<
  Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: string;
  }>
> {
  return await invoke('get_inspector_cookies', { debuggingPort, pageId: pageId ?? null });
}

export async function getInspectorStorage(debuggingPort: number, pageId?: string | null): Promise<
  Array<{ key: string; value: string }>
> {
  return await invoke('get_inspector_storage', { debuggingPort, pageId: pageId ?? null });
}

export async function resetInspectorBrowser(
  debuggingPort: number,
  proxyPort: number,
  profilePath?: string
): Promise<string> {
  return await invoke('reset_inspector_browser', {
    debuggingPort,
    proxyPort,
    profilePath: profilePath ?? null,
  });
}
