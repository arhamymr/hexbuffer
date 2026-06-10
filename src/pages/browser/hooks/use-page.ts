'use client';

import { useEffect, useMemo } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
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
    loadPersistedSessions,
    applySessionStarted,
    applySessionUpdated,
    applyPageDiscovered,
    applyPageUpdated,
    applyInsightCreated,
    applyLogCreated,
    applyHumanInputRequested,
  } = useBrowserAutomationStore();

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
  };
}
