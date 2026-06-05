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
  HumanInputRequest,
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

export interface BrowserAutomationTab {
  id: string;
  name: string;
  setup: CrawlSetupConfig;
  session: CrawlSession | null;
  pages: CrawlPage[];
  insights: AIInsight[];
  logs: ActivityLog[];
  selectedPageId: string | null;
  expandedPageIds: string[];
  humanInputRequest: HumanInputRequest | null;
  lastError: string | null;
  search: string;
  analyzingPageIds: Set<string>;
}

interface BrowserAutomationState {
  tabs: BrowserAutomationTab[];
  activeTabId: string;
  nextTabNumber: number;

  getActiveTab: () => BrowserAutomationTab | null;
  overview: (tabId?: string) => CrawlOverview;
  setActiveTabId: (id: string) => void;
  renameTab: (id: string, name: string) => void;
  addAutomationTab: (setup?: Partial<CrawlSetupConfig>, name?: string) => string;
  closeTab: (id: string) => void;
  updateSetup: (patch: Partial<CrawlSetupConfig>) => void;
  saveConfig: () => void;
  startCrawl: (headless?: boolean) => Promise<void>;
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
  setSearch: (value: string) => void;
  clearArtifactPaths: () => void;
  analyzePageWithAi: (page: CrawlPage) => Promise<void>;
  applySessionStarted: (session: CrawlSession) => void;
  applySessionUpdated: (session: Partial<CrawlSession>) => void;
  applyPageDiscovered: (page: CrawlPage) => void;
  applyPageUpdated: (page: Partial<CrawlPage> & { id: string }) => void;
  applyInsightCreated: (insight: AIInsight) => void;
  applyLogCreated: (log: ActivityLog) => void;
  applyHumanInputRequested: (request: HumanInputRequest) => void;
  submitHumanInput: (
    request: HumanInputRequest,
    action: 'continue' | 'skip-branch' | 'stop-crawl',
    fields?: Record<string, string>
  ) => Promise<void>;
  clearHumanInputRequest: () => void;
  loadPersistedSessions: () => Promise<void>;
}

type BrowserAutomationSet = (
  partial:
    | Partial<BrowserAutomationState>
    | ((state: BrowserAutomationState) => Partial<BrowserAutomationState>),
) => void;

const STORAGE_KEY = '0xbuffer:crawl-setup-config';
const DELETED_SESSIONS_STORAGE_KEY = '0xbuffer:deleted-ai-browser-sessions';
const DEFAULT_EXPANDED_PAGE_IDS = ['page-root', 'page-products', 'page-login'];

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

function isTerminalStatus(status: CrawlSession['status']) {
  return status === 'completed' || status === 'failed' || status === 'stopped';
}

async function invokeOptional(command: string, payload?: Record<string, unknown>) {
  try {
    await invoke(command, payload);
  } catch (error) {
    console.warn(`[browser automation] Optional Tauri command failed: ${command}`, error);
  }
}

function loadSavedConfig(): CrawlSetupConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CRAWL_SETUP, ...parsed };
    }
  } catch {
    // Ignore corrupt storage.
  }
  return { ...DEFAULT_CRAWL_SETUP };
}

function loadDeletedSessionIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_SESSIONS_STORAGE_KEY);
    if (!raw) return new Set();

    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveDeletedSessionIds(sessionIds: Set<string>) {
  try {
    localStorage.setItem(DELETED_SESSIONS_STORAGE_KEY, JSON.stringify([...sessionIds]));
  } catch {
    // Storage full or unavailable - ignore.
  }
}

function markSessionDeleted(sessionId: string) {
  const deletedSessionIds = loadDeletedSessionIds();
  deletedSessionIds.add(sessionId);
  saveDeletedSessionIds(deletedSessionIds);
}

function createAutomationTab(
  index: number,
  setup: CrawlSetupConfig = loadSavedConfig(),
  name = String(index)
): BrowserAutomationTab {
  return {
    id: `browser-automation-tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    setup: { ...setup },
    session: null,
    pages: [],
    insights: [],
    logs: [],
    selectedPageId: null,
    expandedPageIds: [...DEFAULT_EXPANDED_PAGE_IDS],
    humanInputRequest: null,
    lastError: null,
    search: '',
    analyzingPageIds: new Set(),
  };
}

const initialTab = createAutomationTab(1);

function getActiveTabFromState(state: BrowserAutomationState) {
  return state.tabs.find((tab) => tab.id === state.activeTabId) ?? state.tabs[0] ?? null;
}

function updateActiveTab(
  set: BrowserAutomationSet,
  updater: (tab: BrowserAutomationTab) => BrowserAutomationTab
) {
  set((state) => ({
    tabs: state.tabs.map((tab) => (tab.id === state.activeTabId ? updater(tab) : tab)),
  }));
}

function updateTab(
  set: BrowserAutomationSet,
  id: string,
  updater: (tab: BrowserAutomationTab) => BrowserAutomationTab
) {
  set((state) => ({
    tabs: state.tabs.map((tab) => (tab.id === id ? updater(tab) : tab)),
  }));
}

function updateTabForSession(
  set: BrowserAutomationSet,
  get: () => BrowserAutomationState,
  sessionId: string | undefined,
  updater: (tab: BrowserAutomationTab) => BrowserAutomationTab
) {
  const state = get();
  const tab = sessionId
    ? state.tabs.find((item) => item.session?.id === sessionId)
    : getActiveTabFromState(state);

  if (!tab) return;
  updateTab(set, tab.id, updater);
}

export const useBrowserAutomationStore = create<BrowserAutomationState>((set, get) => ({
  tabs: [initialTab],
  activeTabId: initialTab.id,
  nextTabNumber: 2,

  getActiveTab: () => getActiveTabFromState(get()),

  overview: (tabId) => {
    const state = get();
    const tab = tabId
      ? state.tabs.find((item) => item.id === tabId)
      : getActiveTabFromState(state);

    return deriveOverview(tab?.session ?? null, tab?.pages ?? []);
  },

  setActiveTabId: (id) => set({ activeTabId: id }),

  renameTab: (id, name) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, name } : tab)),
    })),

  addAutomationTab: (setupPatch, name) => {
    const { nextTabNumber } = get();
    const newTab = createAutomationTab(
      nextTabNumber,
      { ...loadSavedConfig(), ...setupPatch },
      name || String(nextTabNumber)
    );

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
      nextTabNumber: state.nextTabNumber + 1,
    }));

    return newTab.id;
  },

  closeTab: (id) => {
    const tab = get().tabs.find((item) => item.id === id);
    if (tab?.session) {
      markSessionDeleted(tab.session.id);
      void invokeOptional('delete_ai_browser_session', { sessionId: tab.session.id });
    }

    set((state) => {
      const remainingTabs = state.tabs.filter((item) => item.id !== id);

      if (remainingTabs.length === 0) {
        const replacementTab = createAutomationTab(1);
        return {
          tabs: [replacementTab],
          activeTabId: replacementTab.id,
          nextTabNumber: 2,
        };
      }

      if (state.activeTabId !== id) {
        return { tabs: remainingTabs };
      }

      const closedTabIndex = state.tabs.findIndex((item) => item.id === id);
      const nextActiveTab = remainingTabs[Math.max(0, closedTabIndex - 1)] ?? remainingTabs[0];
      return {
        tabs: remainingTabs,
        activeTabId: nextActiveTab.id,
      };
    });
  },

  updateSetup: (patch) =>
    updateActiveTab(set, (tab) => ({
      ...tab,
      setup: { ...tab.setup, ...patch },
    })),

  saveConfig: () => {
    const tab = getActiveTabFromState(get());
    if (!tab) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tab.setup));
    } catch {
      // Storage full or unavailable - ignore.
    }

    const s = tab.setup;
    const summary = [
      `URL: ${s.targetUrl}`,
      `Depth: ${s.maxDepth}`,
      `Pages: ${s.maxPages}`,
      `Delay: ${s.requestDelayMs}ms`,
      `Timeout: ${s.timeoutMs}ms`,
      `Settle: ${s.networkSettleMs ?? 2000}ms`,
      s.excludePaths.trim() ? `Exclude: ${s.excludePaths}` : null,
      s.captureScreenshots ? 'Screenshots: on' : 'Screenshots: off',
      s.captureRenderedHtml ? 'Rendered HTML: on' : 'Rendered HTML: off',
    ].filter(Boolean).join(', ');

    const sessionId = tab.session?.id ?? `pre-${Date.now()}`;
    updateTab(set, tab.id, (current) => ({
      ...current,
      logs: [
        ...current.logs,
        {
          id: `log-${Date.now()}`,
          sessionId,
          level: 'info',
          type: 'session',
          message: `Config saved — ${summary}`,
          url: s.targetUrl,
          createdAt: new Date().toISOString(),
        },
      ],
    }));
  },

  startCrawl: async (headless = true) => {
    const tab = getActiveTabFromState(get());
    if (!tab) return;

    const setup: CrawlSetupConfig = { ...tab.setup, headless };
    const session = makeSession(setup);

    updateTab(set, tab.id, (current) => ({
      ...current,
      setup,
      session,
      pages: [],
      insights: [],
      logs: [
        {
          id: `log-${Date.now()}`,
          sessionId: session.id,
          level: 'info',
          type: 'session',
          message: `Started for ${setup.targetUrl}${headless ? '' : ' (visible browser)'}`,
          url: setup.targetUrl,
          createdAt: session.startedAt ?? new Date().toISOString(),
        },
      ],
      selectedPageId: null,
      humanInputRequest: null,
      lastError: null,
    }));

    try {
      await invoke('ai_browser_start_crawl', { config: setup, sessionId: session.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updateTab(set, tab.id, (current) => ({
        ...current,
        session: { ...session, status: 'failed', finishedAt: new Date().toISOString() },
        logs: [
          ...current.logs,
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
    const tab = getActiveTabFromState(get());
    const session = tab?.session;
    if (!tab || !session) return;

    updateTab(set, tab.id, (current) => ({
      ...current,
      session: { ...session, status: 'paused' },
    }));
    await invokeOptional(commandName('pause'), { sessionId: session.id });
  },

  resumeCrawl: async () => {
    const tab = getActiveTabFromState(get());
    const session = tab?.session;
    if (!tab || !session) return;

    if (isTerminalStatus(session.status)) {
      updateTab(set, tab.id, (current) => ({ ...current, humanInputRequest: null }));
      return;
    }

    updateTab(set, tab.id, (current) => ({
      ...current,
      session: { ...session, status: 'running' },
      humanInputRequest: null,
    }));
    await invokeOptional(commandName('resume'), { sessionId: session.id });
  },

  stopCrawl: async () => {
    const tab = getActiveTabFromState(get());
    const session = tab?.session;
    if (!tab || !session) return;

    const finishedAt = new Date().toISOString();
    updateTab(set, tab.id, (current) => ({
      ...current,
      session: { ...session, status: 'stopped', finishedAt },
      humanInputRequest: null,
    }));
    await invokeOptional(commandName('stop'), { sessionId: session.id });
  },

  exportCrawl: () => {
    const tab = getActiveTabFromState(get());
    if (!tab) return;

    downloadJson('ai-browser-crawl.json', {
      session: tab.session,
      overview: deriveOverview(tab.session, tab.pages),
      pages: tab.pages,
      insights: tab.insights,
      logs: tab.logs,
    });
  },

  exportInsights: () => {
    const tab = getActiveTabFromState(get());
    if (!tab) return;
    downloadJson('ai-browser-insights.json', tab.insights);
  },

  exportLogs: () => {
    const tab = getActiveTabFromState(get());
    if (!tab) return;
    downloadJson('ai-browser-activity-log.json', tab.logs);
  },

  selectPage: (pageId) =>
    updateActiveTab(set, (tab) => ({
      ...tab,
      selectedPageId: pageId,
    })),

  togglePageExpanded: (pageId) =>
    updateActiveTab(set, (tab) => ({
      ...tab,
      expandedPageIds: tab.expandedPageIds.includes(pageId)
        ? tab.expandedPageIds.filter((id) => id !== pageId)
        : [...tab.expandedPageIds, pageId],
    })),

  toggleInsightReviewed: (insightId) =>
    updateActiveTab(set, (tab) => ({
      ...tab,
      insights: tab.insights.map((insight) =>
        insight.id === insightId ? { ...insight, reviewed: !insight.reviewed } : insight
      ),
    })),

  markPageInteresting: (pageId) =>
    updateActiveTab(set, (tab) => ({
      ...tab,
      pages: tab.pages.map((page) =>
        page.id === pageId ? { ...page, interesting: !page.interesting } : page
      ),
    })),

  applySessionStarted: (session) =>
    updateTabForSession(set, get, session.id, (tab) => ({
      ...tab,
      session,
      pages: [],
      insights: [],
      logs: [],
      selectedPageId: null,
      humanInputRequest: null,
      lastError: null,
    })),

  applySessionUpdated: (patch) =>
    updateTabForSession(set, get, patch.id, (tab) => {
      const session =
        tab.session &&
        isTerminalStatus(tab.session.status) &&
        patch.status !== tab.session.status &&
        patch.status !== 'running'
          ? tab.session
          : tab.session
            ? { ...tab.session, ...patch }
            : null;

      return {
        ...tab,
        session,
        humanInputRequest: tab.humanInputRequest,
      };
    }),

  applyPageDiscovered: (page) =>
    updateTabForSession(set, get, page.sessionId, (tab) => ({
      ...tab,
      pages: tab.pages.some((item) => item.id === page.id)
        ? tab.pages.map((item) => (item.id === page.id ? page : item))
        : [...tab.pages, page],
    })),

  applyPageUpdated: (patch) =>
    updateTabForSession(set, get, patch.sessionId, (tab) => ({
      ...tab,
      pages: tab.pages.map((page) => (page.id === patch.id ? { ...page, ...patch } : page)),
    })),

  applyInsightCreated: (insight) =>
    updateTabForSession(set, get, insight.sessionId, (tab) => ({
      ...tab,
      insights: tab.insights.some((item) => item.id === insight.id)
        ? tab.insights
        : [insight, ...tab.insights],
    })),

  applyLogCreated: (log) =>
    updateTabForSession(set, get, log.sessionId, (tab) => {
      const humanInputRequest =
        log.humanInputRequest ?? (
          log.type === 'human' &&
          tab.humanInputRequest &&
          (!log.url || !tab.humanInputRequest.url || log.url === tab.humanInputRequest.url)
            ? tab.humanInputRequest
            : undefined
        );
      const nextLog = humanInputRequest ? { ...log, humanInputRequest } : log;

      return {
        ...tab,
        humanInputRequest: log.humanInputRequest ?? tab.humanInputRequest,
        logs: tab.logs.some((item) => item.id === log.id) ? tab.logs : [...tab.logs, nextLog],
      };
    }),

  applyHumanInputRequested: (request) =>
    updateTabForSession(set, get, request.sessionId, (tab) => ({
      ...tab,
      humanInputRequest: request,
      logs: tab.logs.map((log) =>
        log.type === 'human' &&
        !log.humanInputRequest &&
        (!log.url || !request.url || log.url === request.url)
          ? { ...log, humanInputRequest: request }
          : log
      ),
    })),

  submitHumanInput: async (request, action, fields = {}) => {
    const tab = get().tabs.find((item) => item.session?.id === request.sessionId);

    updateTabForSession(set, get, request.sessionId, (tab) => ({
      ...tab,
      humanInputRequest: null,
      session:
        tab.session && !isTerminalStatus(tab.session.status) && action === 'continue'
          ? { ...tab.session, status: 'running' }
          : tab.session,
    }));

    if (action === 'continue') {
      if (!tab?.session) {
        get().applyLogCreated({
          id: `log-${Date.now()}`,
          sessionId: request.sessionId,
          level: 'error',
          type: 'policy',
          message: 'Failed to start branch crawler: session not found.',
          url: request.url,
          createdAt: new Date().toISOString(),
        });
        updateTabForSession(set, get, request.sessionId, (tab) => ({
          ...tab,
          humanInputRequest: request,
        }));
        return;
      }

      const resumeConfig: CrawlSetupConfig = {
        ...tab.setup,
        targetUrl: tab.setup.targetUrl,
        resumeFromUrl: request.url ?? tab.setup.targetUrl,
        humanInputFields: fields,
      };
      const resumedSession: CrawlSession = {
        ...tab.session,
        status: 'running',
        startedAt: tab.session.startedAt ?? new Date().toISOString(),
        finishedAt: undefined,
      };

      updateTab(set, tab.id, (current) => ({
        ...current,
        session: resumedSession,
        logs: [
          ...current.logs,
          {
            id: `log-${Date.now()}`,
            sessionId: request.sessionId,
            level: 'info',
            type: 'human',
            message: `Started branch crawler for human input at ${resumeConfig.resumeFromUrl}.`,
            url: resumeConfig.resumeFromUrl,
            createdAt: new Date().toISOString(),
          },
        ],
        humanInputRequest: null,
      }));

      try {
        await invoke('ai_browser_start_crawl', {
          config: resumeConfig,
          sessionId: request.sessionId,
          appendExisting: true,
        });
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        get().applyLogCreated({
          id: `log-${Date.now()}`,
          sessionId: request.sessionId,
          level: 'error',
          type: 'policy',
          message: `Failed to start branch crawler: ${message}`,
          url: request.url,
          createdAt: new Date().toISOString(),
        });
        updateTabForSession(set, get, request.sessionId, (tab) => ({
          ...tab,
          humanInputRequest: request,
        }));
        return;
      }
    }

    if (action === 'stop-crawl') {
      try {
        await invoke('ai_browser_stop_crawl', { sessionId: request.sessionId });
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        get().applyLogCreated({
          id: `log-${Date.now()}`,
          sessionId: request.sessionId,
          level: 'error',
          type: 'policy',
          message: `Failed to stop crawl: ${message}`,
          url: request.url,
          createdAt: new Date().toISOString(),
        });
        updateTabForSession(set, get, request.sessionId, (tab) => ({
          ...tab,
          humanInputRequest: request,
        }));
        return;
      }
    }

    try {
      await invoke('ai_browser_submit_human_input', {
        sessionId: request.sessionId,
        requestId: request.id,
        action,
        fields: {},
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      get().applyLogCreated({
        id: `log-${Date.now()}`,
        sessionId: request.sessionId,
        level: 'error',
        type: 'policy',
        message: `Failed to submit human input: ${message}`,
        url: request.url,
        createdAt: new Date().toISOString(),
      });
      updateTabForSession(set, get, request.sessionId, (tab) => ({
        ...tab,
        humanInputRequest: request,
      }));
    }
  },

  clearHumanInputRequest: () =>
    updateActiveTab(set, (tab) => ({
      ...tab,
      humanInputRequest: null,
    })),

  setSearch: (value) =>
    updateActiveTab(set, (tab) => ({
      ...tab,
      search: value,
    })),

  clearArtifactPaths: () =>
    set((state) => ({
      tabs: state.tabs.map((tab) => ({
        ...tab,
        pages: tab.pages.map((page) => ({
          ...page,
          screenshotPath: undefined,
          renderedHtmlPath: undefined,
        })),
      })),
    })),

  analyzePageWithAi: async (page) => {
    const tab =
      get().tabs.find((item) => item.session?.id === page.sessionId) ?? getActiveTabFromState(get());
    if (!tab || !tab.session || tab.analyzingPageIds.has(page.id)) return;

    updateTab(set, tab.id, (current) => ({
      ...current,
      analyzingPageIds: new Set(current.analyzingPageIds).add(page.id),
    }));

    try {
      const response = await invoke<{ content: string }>('send_ai_chat_message', {
        request: {
          messages: [
            {
              role: 'user',
              content: `Analyze this crawled page for security reconnaissance insights:\n\nURL: ${page.url}\nTitle: ${page.title || 'unknown'}\nHTTP Status: ${page.httpStatus || 'unknown'}\nLinks Found: ${page.linksFound}\nForms Found: ${page.formsFound}\n${page.aiSummary ? `Previous summary: ${page.aiSummary}` : ''}\n\nProvide a brief analysis: potential vulnerabilities, interesting endpoints, and security observations.`,
            },
          ],
        },
      });

      get().applyPageUpdated({ id: page.id, sessionId: page.sessionId, aiSummary: response.content });

      get().applyInsightCreated({
        id: `insight-ai-${Date.now()}`,
        sessionId: tab.session.id,
        pageId: page.id,
        severity: 'info',
        type: 'ai-analysis',
        title: `AI Analysis: ${page.title || page.url}`,
        description: response.content,
        url: page.url,
        aiUsedForAnalysis: true,
        analysisSource: 'ai',
        reviewed: false,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to analyze page with AI:', error);
      get().applyLogCreated({
        id: `log-${Date.now()}`,
        sessionId: tab.session.id,
        level: 'error',
        type: 'ai',
        message: `AI analysis failed for ${page.url}: ${error instanceof Error ? error.message : String(error)}`,
        url: page.url,
        createdAt: new Date().toISOString(),
      });
    } finally {
      updateTab(set, tab.id, (current) => {
        const next = new Set(current.analyzingPageIds);
        next.delete(page.id);
        return { ...current, analyzingPageIds: next };
      });
    }
  },

  loadPersistedSessions: async () => {
    try {
      const sessions = await invoke<CrawlSession[]>('list_recent_ai_browser_sessions', { limit: 20 });
      if (!sessions.length) return;
      const deletedSessionIds = loadDeletedSessionIds();
      const visibleSessions = sessions.filter((session) => !deletedSessionIds.has(session.id));

      sessions
        .filter((session) => deletedSessionIds.has(session.id))
        .forEach((session) => {
          void invokeOptional('delete_ai_browser_session', { sessionId: session.id });
        });

      if (!visibleSessions.length) return;

      const state = get();
      const hasActiveData = state.tabs.some(
        (tab) => tab.session || tab.pages.length > 0 || tab.insights.length > 0 || tab.logs.length > 0
      );
      if (hasActiveData) return;

      const hydratedTabs: BrowserAutomationTab[] = [];
      let tabNumber = 1;

      for (const session of visibleSessions) {
        const [pages, insights, logs] = await Promise.all([
          invoke<CrawlPage[]>('list_ai_browser_pages', { sessionId: session.id }).catch(() => [] as CrawlPage[]),
          invoke<AIInsight[]>('list_ai_browser_insights', { sessionId: session.id }).catch(() => [] as AIInsight[]),
          invoke<ActivityLog[]>('list_ai_browser_logs', { sessionId: session.id }).catch(() => [] as ActivityLog[]),
        ]);

        hydratedTabs.push({
          id: `browser-automation-tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: tabNumber === 1 ? String(tabNumber) : String(tabNumber),
          setup: { ...loadSavedConfig() },
          session,
          pages,
          insights,
          logs,
          selectedPageId: null,
          expandedPageIds: [...DEFAULT_EXPANDED_PAGE_IDS],
          humanInputRequest: null,
          lastError: null,
          search: '',
          analyzingPageIds: new Set(),
        });

        tabNumber++;
      }

      if (hydratedTabs.length > 0) {
        set({
          tabs: hydratedTabs,
          activeTabId: hydratedTabs[0].id,
          nextTabNumber: hydratedTabs.length + 1,
        });
      }
    } catch (error) {
      console.warn('[browser automation] Failed to load persisted sessions:', error);
    }
  },
}));
