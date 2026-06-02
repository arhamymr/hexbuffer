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
    session,
    pages,
    insights,
    logs,
    selectedPageId,
    search,
    overview,
    applySessionStarted,
    applySessionUpdated,
    applyPageDiscovered,
    applyPageUpdated,
    applyInsightCreated,
    applyLogCreated,
    applyHumanInputRequested,
  } = useBrowserAutomationStore();

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
        unlisteners.push(await listen<{ message?: string }>('ai-browser:session-failed', (event) => {
          applySessionUpdated({ status: 'failed', finishedAt: new Date().toISOString() });
          applyLogCreated({
            id: `log-${Date.now()}`,
            sessionId: session?.id ?? 'unknown',
            level: 'error',
            type: 'error',
            message: event.payload?.message ?? 'Crawl failed',
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
    session?.id,
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
      log.type.toLowerCase().includes(query)
    );
  }, [search, logs]);

  const interestingPages = useMemo(() => {
    return pages.filter((page) => page.interesting && page.status !== 'queued');
  }, [pages]);

  return {
    crawlTree,
    selectedPage,
    filteredInsights,
    filteredLogs,
    interestingPages,
    overview: overview(),
  };
}
