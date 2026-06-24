import { useRepeaterStore } from '@/stores/repeater';
import { parseRawHttpRequest } from '@/lib/http-message';
import { sendRepeaterRequest } from '@/pages/repeater/api';
import type { ParsedRepeaterRequest } from '@/pages/repeater/types';

export async function sendRequest(): Promise<void> {
  const store = useRepeaterStore.getState();
  const activeTab = store.tabs.find((t) => t.id === store.activeTabId) ?? store.tabs[0];
  if (!activeTab) return;

  store.updateTab(activeTab.id, (tab) => ({
    ...tab,
    isLoading: true,
    error: null,
  }));

  try {
    const parsedRequest = parseRawHttpRequest(activeTab.request.raw, {
      fallbackUrl: activeTab.request.url,
    }) as ParsedRepeaterRequest;
    const response = await sendRepeaterRequest(parsedRequest);
    store.updateTab(activeTab.id, (tab) => ({
      ...tab,
      isLoading: false,
      response,
    }));
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Failed to send request.';
    store.updateTab(activeTab.id, (tab) => ({
      ...tab,
      isLoading: false,
      error: errorMessage,
    }));
  }
}
