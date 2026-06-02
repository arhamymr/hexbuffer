import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { DEFAULT_CRAWL_SETUP } from '@/pages/browser-automation/constants';
import { deriveOverview, downloadJson } from '@/pages/browser-automation/lib/crawl-data';
import type {
  ActivityLog,
  AIInsight,
  CrawlOverview,
  CrawlPage,
  CrawlSession,
  CrawlSetupConfig,
} from '@/pages/browser-automation/types';

export interface BrowserStatus {
  running: boolean;
  url: string | null;
  pid: number | null;
}

export interface AccessibilityElement {
  refId: string;
  role: string;
  name: string;
  value: string | null;
  interactive: boolean;
}

export interface BrowserSnapshot {
  url: string;
  title: string;
  elements: AccessibilityElement[];
}

export interface DiscoveredApi {
  method: string;
  path: string;
  timestamp: Date;
}

export interface ActionLogEntry {
  timestamp: Date;
  type: 'command' | 'result' | 'error' | 'ai';
  message: string;
}

interface BrowserAutomationState {
  setup: CrawlSetupConfig;
  session: CrawlSession | null;
  pages: CrawlPage[];
  insights: AIInsight[];
  logs: ActivityLog[];
  selectedPageId: string | null;
  expandedPageIds: string[];
  lastError: string | null;

  overview: () => CrawlOverview;
  updateSetup: (patch: Partial<CrawlSetupConfig>) => void;
  startCrawl: () => Promise<void>;
  pauseCrawl: () => Promise<void>;
  resumeCrawl: () => Promise<void>;
  stopCrawl: () => Promise<void>;
  exportCrawl: () => void;
  exportInsights: () => void;
  exportLogs: () => void;
  selectPage: (pageId: string | null) => void;
  togglePageExpanded: (pageId: string) => void;
  toggleInsightReviewed: (insightId: string) => void;
  markPageInteresting: (pageId: string) => void;
  applySessionStarted: (session: CrawlSession) => void;
  applySessionUpdated: (session: Partial<CrawlSession>) => void;
  applyPageDiscovered: (page: CrawlPage) => void;
  applyPageUpdated: (page: Partial<CrawlPage> & { id: string }) => void;
  applyInsightCreated: (insight: AIInsight) => void;
  applyLogCreated: (log: ActivityLog) => void;
}

function makeSession(setup: CrawlSetupConfig): CrawlSession {
  return {
    id: `crawl-${Date.now()}`,
    targetUrl: setup.targetUrl,
    status: 'running',
    strategy: setup.strategy,
    maxDepth: setup.maxDepth,
    maxPages: setup.maxPages,
    startedAt: new Date().toISOString(),
  };
}

function commandName(action: 'pause' | 'resume' | 'stop') {
  return `ai_browser_${action}_crawl`;
}

async function invokeOptional(command: string, payload?: Record<string, unknown>) {
  try {
    await invoke(command, payload);
  } catch (error) {
    console.warn(`[browser automation] Optional Tauri command failed: ${command}`, error);
  }
}

export const useBrowserAutomationStore = create<BrowserAutomationState>((set, get) => ({
  setup: DEFAULT_CRAWL_SETUP,
  session: null,
  pages: [],
  insights: [],
  logs: [],
  selectedPageId: null,
  expandedPageIds: ['page-root', 'page-products', 'page-login'],
  lastError: null,

  overview: () => deriveOverview(get().session, get().pages),

  updateSetup: (patch) =>
    set((state) => ({
      setup: { ...state.setup, ...patch },
    })),

  startCrawl: async () => {
    const setup = get().setup;
    const session = makeSession(setup);

    set({
      session,
      pages: [],
      insights: [],
      logs: [
        {
          id: `log-${Date.now()}`,
          sessionId: session.id,
          level: 'info',
          type: 'session',
          message: `Started crawl for ${setup.targetUrl}`,
          url: setup.targetUrl,
          createdAt: session.startedAt ?? new Date().toISOString(),
        },
      ],
      selectedPageId: null,
      lastError: null,
    });

    try {
      await invoke('ai_browser_start_crawl', { config: setup, sessionId: session.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set((state) => ({
        session: { ...session, status: 'failed', finishedAt: new Date().toISOString() },
        logs: [
          ...state.logs,
          {
            id: `log-${Date.now()}`,
            sessionId: session.id,
            level: 'error',
            type: 'error',
            message: `Failed to start crawl: ${message}`,
            url: setup.targetUrl,
            createdAt: new Date().toISOString(),
          },
        ],
        lastError: message,
      }));
    }
  },

  pauseCrawl: async () => {
    const session = get().session;
    if (!session) return;
    set({ session: { ...session, status: 'paused' } });
    await invokeOptional(commandName('pause'), { sessionId: session.id });
  },

  resumeCrawl: async () => {
    const session = get().session;
    if (!session) return;
    set({ session: { ...session, status: 'running' } });
    await invokeOptional(commandName('resume'), { sessionId: session.id });
  },

  stopCrawl: async () => {
    const session = get().session;
    if (!session) return;
    const finishedAt = new Date().toISOString();
    set({ session: { ...session, status: 'stopped', finishedAt } });
    await invokeOptional(commandName('stop'), { sessionId: session.id });
  },

  exportCrawl: () => {
    const state = get();
    downloadJson('ai-browser-crawl.json', {
      session: state.session,
      overview: state.overview(),
      pages: state.pages,
      insights: state.insights,
      logs: state.logs,
    });
  },

  exportInsights: () => {
    downloadJson('ai-browser-insights.json', get().insights);
  },

  exportLogs: () => {
    downloadJson('ai-browser-activity-log.json', get().logs);
  },

  selectPage: (pageId) => set({ selectedPageId: pageId }),

  togglePageExpanded: (pageId) =>
    set((state) => ({
      expandedPageIds: state.expandedPageIds.includes(pageId)
        ? state.expandedPageIds.filter((id) => id !== pageId)
        : [...state.expandedPageIds, pageId],
    })),

  toggleInsightReviewed: (insightId) =>
    set((state) => ({
      insights: state.insights.map((insight) =>
        insight.id === insightId ? { ...insight, reviewed: !insight.reviewed } : insight
      ),
    })),

  markPageInteresting: (pageId) =>
    set((state) => ({
      pages: state.pages.map((page) =>
        page.id === pageId ? { ...page, interesting: !page.interesting } : page
      ),
    })),

  applySessionStarted: (session) =>
    set({
      session,
      pages: [],
      insights: [],
      logs: [],
      selectedPageId: null,
      lastError: null,
    }),

  applySessionUpdated: (patch) =>
    set((state) => ({
      session: state.session ? { ...state.session, ...patch } : null,
    })),

  applyPageDiscovered: (page) =>
    set((state) => ({
      pages: state.pages.some((item) => item.id === page.id)
        ? state.pages.map((item) => (item.id === page.id ? page : item))
        : [...state.pages, page],
    })),

  applyPageUpdated: (patch) =>
    set((state) => ({
      pages: state.pages.map((page) => (page.id === patch.id ? { ...page, ...patch } : page)),
    })),

  applyInsightCreated: (insight) =>
    set((state) => ({
      insights: state.insights.some((item) => item.id === insight.id)
        ? state.insights
        : [insight, ...state.insights],
    })),

  applyLogCreated: (log) =>
    set((state) => ({
      logs: state.logs.some((item) => item.id === log.id) ? state.logs : [...state.logs, log],
    })),
}));
