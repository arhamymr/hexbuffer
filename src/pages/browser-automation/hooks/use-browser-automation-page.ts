'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';
import { copyText } from '@/lib/clipboard';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { buildCrawlTree } from '../lib/crawl-data';
import type {
  ActivityLog,
  ActivityLogType,
  AIInsight,
  CrawlPage,
  CrawlPageStatus,
  CrawlSession,
  InsightSeverity,
} from '../types';

type SeverityFilter = InsightSeverity | 'all';
type PageStatusFilter = CrawlPageStatus | 'all';
type LogTypeFilter = ActivityLogType | 'all';

export function useBrowserAutomationPage() {
  const {
    setup,
    session,
    pages,
    insights,
    logs,
    selectedPageId,
    expandedPageIds,
    overview,
    updateSetup,
    startCrawl,
    pauseCrawl,
    resumeCrawl,
    stopCrawl,
    exportCrawl,
    exportInsights,
    exportLogs,
    selectPage,
    toggleInsightReviewed,
    markPageInteresting,
    applySessionStarted,
    applySessionUpdated,
    applyPageDiscovered,
    applyPageUpdated,
    applyInsightCreated,
    applyLogCreated,
  } = useBrowserAutomationStore();

  const [pageSearch, setPageSearch] = useState('');
  const [pageStatusFilter, setPageStatusFilter] = useState<PageStatusFilter>('all');
  const [insightSeverityFilter, setInsightSeverityFilter] = useState<SeverityFilter>('all');
  const [insightTypeFilter, setInsightTypeFilter] = useState('all');
  const [logSearch, setLogSearch] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState<LogTypeFilter>('all');

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
    session?.id,
  ]);

  const filteredPages = useMemo(() => {
    const query = pageSearch.trim().toLowerCase();

    return pages.filter((page) => {
      const matchesSearch =
        !query ||
        page.url.toLowerCase().includes(query) ||
        page.title?.toLowerCase().includes(query);
      const matchesStatus = pageStatusFilter === 'all' || page.status === pageStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [pageSearch, pageStatusFilter, pages]);

  const crawlTree = useMemo(() => buildCrawlTree(filteredPages), [filteredPages]);
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null;

  const filteredInsights = useMemo(() => {
    return insights.filter((insight) => {
      const matchesSeverity =
        insightSeverityFilter === 'all' || insight.severity === insightSeverityFilter;
      const matchesType = insightTypeFilter === 'all' || insight.type === insightTypeFilter;
      return matchesSeverity && matchesType;
    });
  }, [insightSeverityFilter, insightTypeFilter, insights]);

  const insightTypes = useMemo(() => {
    return Array.from(new Set(insights.map((insight) => insight.type))).sort();
  }, [insights]);

  const filteredLogs = useMemo(() => {
    const query = logSearch.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch =
        !query ||
        log.message.toLowerCase().includes(query) ||
        log.url?.toLowerCase().includes(query);
      const matchesType = logTypeFilter === 'all' || log.type === logTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [logSearch, logTypeFilter, logs]);

  const handleInsightOpen = useCallback((insight: AIInsight) => {
    if (insight.pageId) {
      selectPage(insight.pageId);
      return;
    }

    const page = pages.find((item) => item.url === insight.url);
    selectPage(page?.id ?? null);
  }, [pages, selectPage]);

  const handleCopyLog = useCallback((log: ActivityLog) => {
    copyText(`${new Date(log.createdAt).toLocaleTimeString()} [${log.type}] ${log.message}`);
  }, []);

  const handleCopyPageUrl = useCallback((page: CrawlPage) => {
    const base = session?.targetUrl?.replace(/\/$/, '') ?? '';
    copyText(page.url.startsWith('http') ? page.url : `${base}${page.url}`);
  }, [session?.targetUrl]);

  const handleOpenPage = useCallback(async (page: CrawlPage) => {
    const base = session?.targetUrl?.replace(/\/$/, '') ?? '';
    const url = page.url.startsWith('http') ? page.url : `${base}${page.url}`;

    try {
      await openUrl(url);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [session?.targetUrl]);

  return {
    setup,
    session,
    overview: overview(),
    pages,
    insights,
    logs,
    crawlTree,
    selectedPage,
    expandedPageIds,
    pageSearch,
    pageStatusFilter,
    insightSeverityFilter,
    insightTypeFilter,
    insightTypes,
    logSearch,
    logTypeFilter,
    filteredInsights,
    filteredLogs,
    updateSetup,
    startCrawl,
    pauseCrawl,
    resumeCrawl,
    stopCrawl,
    exportCrawl,
    exportInsights,
    exportLogs,
    selectPage,
    toggleInsightReviewed,
    markPageInteresting,
    setPageSearch,
    setPageStatusFilter,
    setInsightSeverityFilter,
    setInsightTypeFilter,
    setLogSearch,
    setLogTypeFilter,
    handleInsightOpen,
    handleCopyLog,
    handleCopyPageUrl,
    handleOpenPage,
  };
}
