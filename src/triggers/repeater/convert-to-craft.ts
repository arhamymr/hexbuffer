import { useRepeaterStore } from '@/stores/repeater';
import { useCollectionsStore } from '@/stores/collections';
import { useNavStore } from '@/stores/nav';
import { parseRawHttpRequest, buildRawHttpRequest } from '@/lib/http-message';
import type { ParsedRepeaterRequest } from '@/pages/repeater/types';

/**
 * Take the active repeater tab's raw HTTP request and populate it into
 * Craft mode's structured request builder fields (method, url, headers, body).
 */
export function convertRepeaterToCraft(): void {
  const repeaterStore = useRepeaterStore.getState();
  const activeTab =
    repeaterStore.tabs.find((t) => t.id === repeaterStore.activeTabId) ??
    repeaterStore.tabs[0];

  if (!activeTab) return;

  const collectionsStore = useCollectionsStore.getState();

  try {
    const parsed = parseRawHttpRequest(activeTab.request.raw, {
      fallbackUrl: activeTab.request.url,
    }) as ParsedRepeaterRequest;

    const headers = Object.entries(parsed.headers || {}).map(([key, value]) => ({
      key,
      value,
      enabled: true,
    }));

    collectionsStore.updateActiveRequest(() => ({
      method: parsed.method || 'GET',
      url: parsed.url || activeTab.request.url || '',
      headers,
      body: parsed.body || '',
      bodyType: parsed.body ? 'raw' : 'none',
      preScript: '',
      testScript: '',
      response: null,
      isLoading: false,
      error: null,
      testResults: [],
    }));

    // Switch to craft mode
    collectionsStore.setMode('craft');
  } catch {
    // If parsing fails, just populate basic fields
    collectionsStore.updateActiveRequest(() => ({
      method: 'GET',
      url: activeTab.request.url || '',
      headers: [],
      body: activeTab.request.raw || '',
      bodyType: activeTab.request.raw ? 'raw' : 'none',
    }));
    collectionsStore.setMode('craft');
  }
}

/**
 * Take the active craft endpoint's structured request and open it as a
 * new raw HTTP tab in Repeater mode, then switch to repeater mode.
 */
export function convertCraftToRepeater(): void {
  const collectionsStore = useCollectionsStore.getState();
  const req = collectionsStore.activeRequest;

  if (!req.url && !req.body) return;

  const headersObj: Record<string, string> = {};
  req.headers.forEach((h) => {
    if (h.enabled && h.key) {
      headersObj[h.key] = h.value;
    }
  });

  const raw = buildRawHttpRequest({
    method: req.method,
    url: req.url,
    headers: headersObj,
    body: req.body,
  });

  useRepeaterStore.getState().addRequestTab({ raw, url: req.url });
  useNavStore.getState().triggerNavBlink('/repeater');
  collectionsStore.setMode('repeater');
}
