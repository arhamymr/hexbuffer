import { invoke } from '@tauri-apps/api/core';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { useNavStore } from '@/stores/nav';

export interface TriggerScanOptions {
  url: string;
  maxDepth?: number;
  maxPages?: number;
  headless?: boolean;
}

export async function triggerScan(options: TriggerScanOptions): Promise<void> {
  const { url, maxDepth, maxPages, headless } = options;
  if (!url) return;

  // Ensure the proxy is running before launching the browser crawl.
  try {
    const status = await invoke<{ running: boolean }>('get_proxy_status');
    if (!status.running) {
      await invoke('start_proxy', { port: 8888, tlsPort: 8889 });
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  } catch (error) {
    console.error('[orchestrator] Failed to ensure proxy is running:', error);
  }

  const store = useBrowserAutomationStore.getState();
  store.updateSetup({
    targetUrl: url,
    maxDepth: maxDepth ?? 3,
    maxPages: maxPages ?? 100,
  });
  store.startCrawl(headless ?? true);
  useNavStore.getState().triggerNavBlink('/browser-automation');
}

export async function pauseScan(): Promise<void> {
  useBrowserAutomationStore.getState().pauseCrawl();
}

export async function resumeScan(): Promise<void> {
  useBrowserAutomationStore.getState().resumeCrawl();
}

export async function stopScan(): Promise<void> {
  useBrowserAutomationStore.getState().stopCrawl();
}

export interface SubmitCrawlInputOptions {
  sessionId: string;
  fields: Record<string, string>;
}

export async function submitCrawlInput(options: SubmitCrawlInputOptions): Promise<void> {
  const { sessionId, fields } = options;
  if (!sessionId || !fields) return;

  const store = useBrowserAutomationStore.getState();
  const tab = store.tabs.find((t) => t.session?.id === sessionId);
  if (!tab?.session || !tab.humanInputRequest) return;

  store.submitHumanInput(tab.humanInputRequest, 'continue', fields);
}
