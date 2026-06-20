import { useBrowserAutomationStore } from '@/stores/browser-automation';

export function toggleBrowserCrawl(): void {
  const store = useBrowserAutomationStore.getState();
  const tab = store.tabs.find((t) => t.id === store.activeTabId);
  if (!tab) return;
  const status = tab.session?.status;
  if (status === 'running') {
    void store.pauseCrawl();
  } else if (status === 'paused') {
    void store.resumeCrawl();
  }
}

export function stopBrowserCrawl(): void {
  void useBrowserAutomationStore.getState().stopCrawl();
}

export function startBrowserCrawl(): void {
  const store = useBrowserAutomationStore.getState();
  const tab = store.tabs.find((t) => t.id === store.activeTabId);
  if (!tab?.setup?.targetUrl?.trim()) return;
  void store.startCrawl(true);
}
