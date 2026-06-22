import { useEffect, useMemo } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useAppStore } from '@/stores/app';
import { useBrowserAutomationStore, type ActionLogEntry } from '@/stores/browser-automation';
import { useShallow } from 'zustand/react/shallow';
import { buildCrawlTree } from '../lib/crawl-data';
import type {
  ActivityLog,
  AIInsight,
  CrawlPage,
  CrawlSession,
  HumanInputRequest,
} from '../types';

export function useBrowserAutomationPage() {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    renameTab,
    closeTab,
    overview,
    updateSetup,
    saveConfig,
    clearLogs,
    loadPersistedSessions,
    applySessionStarted,
    applySessionUpdated,
    applyPageDiscovered,
    applyPageUpdated,
    applyInsightCreated,
    applyLogCreated,
    applyHumanInputRequested,
  } = useBrowserAutomationStore(
    useShallow((s) => ({
      tabs: s.tabs,
      activeTabId: s.activeTabId,
      setActiveTabId: s.setActiveTabId,
      renameTab: s.renameTab,
      closeTab: s.closeTab,
      overview: s.overview,
      updateSetup: s.updateSetup,
      saveConfig: s.saveConfig,
      clearLogs: s.clearLogs,
      loadPersistedSessions: s.loadPersistedSessions,
      applySessionStarted: s.applySessionStarted,
      applySessionUpdated: s.applySessionUpdated,
      applyPageDiscovered: s.applyPageDiscovered,
      applyPageUpdated: s.applyPageUpdated,
      applyInsightCreated: s.applyInsightCreated,
      applyLogCreated: s.applyLogCreated,
      applyHumanInputRequested: s.applyHumanInputRequested,
    }))
  );

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null,
    [activeTabId, tabs]
  );

  const pages = activeTab?.pages ?? [];
  const insights = activeTab?.insights ?? [];
  const logs = activeTab?.logs ?? [];
  const selectedPageId = activeTab?.selectedPageId ?? null;
  const search = activeTab?.search ?? '';

  useEffect(() => {
    loadPersistedSessions();
  }, [loadPersistedSessions]);

  useEffect(() => {
    const unlisteners: Array<() => void> = [];
    let mounted = true;

    async function wireEvents() {
      try {
        unlisteners.push(await listen<CrawlSession>('ai-browser:session-started', (event) => {
          applySessionStarted(event.payload);
        }));
        unlisteners.push(await listen<Partial<CrawlSession>>('ai-browser:session-updated', (event) => {
          applySessionUpdated(event.payload);
        }));
        unlisteners.push(await listen<CrawlPage>('ai-browser:page-discovered', (event) => {
          applyPageDiscovered(event.payload);
        }));
        unlisteners.push(await listen<Partial<CrawlPage> & { id: string }>('ai-browser:page-updated', (event) => {
          applyPageUpdated(event.payload);
        }));
        unlisteners.push(await listen<AIInsight>('ai-browser:insight-created', (event) => {
          applyInsightCreated(event.payload);
        }));
        unlisteners.push(await listen<ActivityLog>('ai-browser:log-created', (event) => {
          applyLogCreated(event.payload);
        }));
        unlisteners.push(await listen<HumanInputRequest>('ai-browser:human-input-requested', (event) => {
          applyHumanInputRequested(event.payload);
        }));
        unlisteners.push(await listen<CrawlSession>('ai-browser:session-finished', (event) => {
          applySessionUpdated({ ...event.payload, status: 'completed' });
        }));
        unlisteners.push(await listen<{ message?: string; sessionId?: string }>('ai-browser:session-failed', (event) => {
          applySessionUpdated({ id: event.payload?.sessionId, status: 'failed', finishedAt: new Date().toISOString() });
          applyLogCreated({
            id: `log-${Date.now()}`,
            sessionId: event.payload?.sessionId ?? useBrowserAutomationStore.getState().getActiveTab()?.session?.id ?? 'unknown',
            level: 'error',
            type: 'error',
            message: event.payload?.message ?? 'Automation failed',
            createdAt: new Date().toISOString(),
          });
        }));
      } catch (error) {
        if (mounted) {
          console.warn('[browser automation] Tauri event listeners are unavailable in this runtime.', error);
        }
      }
    }

    wireEvents();

    return () => {
      mounted = false;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [
    applyInsightCreated,
    applyLogCreated,
    applyPageDiscovered,
    applyPageUpdated,
    applySessionStarted,
    applySessionUpdated,
    applyHumanInputRequested,
  ]);

  const filteredPages = useMemo(() => {
    const query = search.trim().toLowerCase();
    return pages.filter((page) =>
      !query ||
      page.url.toLowerCase().includes(query) ||
      page.title?.toLowerCase().includes(query)
    );
  }, [search, pages]);

  const crawlTree = useMemo(() => buildCrawlTree(filteredPages), [filteredPages]);

  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null;

  const filteredInsights = useMemo(() => {
    const query = search.trim().toLowerCase();
    return insights.filter((insight) =>
      !query ||
      insight.title.toLowerCase().includes(query) ||
      insight.description.toLowerCase().includes(query) ||
      insight.type.toLowerCase().includes(query) ||
      insight.url?.toLowerCase().includes(query)
    );
  }, [search, insights]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) =>
      !query ||
      log.message.toLowerCase().includes(query) ||
      log.url?.toLowerCase().includes(query) ||
      log.type.toLowerCase().includes(query) ||
      (log.extra ? JSON.stringify(log.extra).toLowerCase().includes(query) : false)
    );
  }, [search, logs]);

  const interestingPages = useMemo(() => {
    return pages.filter((page) => page.interesting && page.status !== 'queued');
  }, [pages]);

  // Safety alert state from app store
  const browserAutomationSafetyAlertDismissed = useAppStore(
    (state) => state.browserAutomationSafetyAlertDismissed
  );
  const setBrowserAutomationSafetyAlertDismissed = useAppStore(
    (state) => state.setBrowserAutomationSafetyAlertDismissed
  );

  // Derive status and isRunning from active tab session
  const status = activeTab?.session?.status ?? 'idle';
  const isRunning = status === 'running';

  // Transform logs into ActionLogEntry format for the panel
  const actionLogs = useMemo(() => {
    const tabLogs = activeTab?.logs ?? [];
    return tabLogs.map((l) => ({
      timestamp: new Date(l.createdAt),
      type: (l.type === 'session' || l.type === 'policy' || l.type === 'human' ? 'command' : l.type === 'error' ? 'error' : l.type === 'ai' ? 'ai' : 'result') as ActionLogEntry['type'],
      message: l.message,
    }));
  }, [activeTab?.logs]);

  return {
    tabs: tabs.map((tab) => ({ id: tab.id, name: tab.name })),
    activeTabId,
    setActiveTabId,
    renameTab,
    closeTab,
    activeTab,
    crawlTree,
    selectedPage,
    filteredInsights,
    filteredLogs,
    interestingPages,
    overview: overview(activeTab?.id),
    // Absorbed from index.tsx
    updateSetup,
    saveConfig,
    clearLogs,
    status,
    isRunning,
    actionLogs,
    browserAutomationSafetyAlertDismissed,
    setBrowserAutomationSafetyAlertDismissed,
  };
}
