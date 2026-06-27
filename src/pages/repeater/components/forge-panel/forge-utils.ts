import type { KeyValuePair } from '@/stores/collections';

export function getQueryParams(url: string): KeyValuePair[] {
  try {
    const urlObj = new URL(url);
    const params: KeyValuePair[] = [];
    urlObj.searchParams.forEach((value, key) => {
      params.push({ key, value, enabled: true });
    });
    return params;
  } catch {
    return [];
  }
}

export function rebuildUrl(
  updateUrl: (url: string) => void,
  currentUrl: string,
  params: KeyValuePair[],
): void {
  try {
    let baseUrl = currentUrl.split('?')[0];
    const activeParams = params.filter((p) => p.enabled && p.key);
    if (activeParams.length > 0) {
      const query = activeParams
        .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join('&');
      baseUrl = `${baseUrl}?${query}`;
    }
    updateUrl(baseUrl);
  } catch {
    // ignore invalid URLs
  }
}

export function getFormattedBody(body: string): string {
  try {
    const obj = JSON.parse(body);
    return JSON.stringify(obj, null, 2);
  } catch {
    return body;
  }
}

export function deriveActiveEndpoint(
  endpoints: Array<{ id: string; name: string }>,
  selectedNodeId: string | null,
): { id: string; name: string } | null {
  const activeEndpointId = selectedNodeId?.startsWith('ep-')
    ? selectedNodeId.slice(3)
    : null;
  if (!activeEndpointId) return null;
  return endpoints.find((e) => e.id === activeEndpointId) ?? null;
}
