import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

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

export interface BrowserStatus {
  running: boolean;
  url: string | null;
  pid: number | null;
}

export interface ActionLogEntry {
  timestamp: Date;
  type: 'command' | 'result' | 'error' | 'ai';
  message: string;
}

export interface BrowserAutomationTab {
  id: string;
  name: string;
  url: string;
  instruction: string;
  isRunning: boolean;
  snapshot: BrowserSnapshot | null;
  actions: ActionLogEntry[];
  discoveredApis: DiscoveredApi[];
}

export interface DiscoveredApi {
  method: string;
  path: string;
  timestamp: Date;
}

interface BrowserAutomationState {
  tabs: BrowserAutomationTab[];
  activeTabId: string;
  nextTabNumber: number;
  browserStatus: BrowserStatus | null;

  setActiveTabId: (id: string) => void;
  addTab: () => string;
  closeTab: (id: string) => void;
  renameTab: (id: string, name: string) => void;

  updateUrl: (id: string, url: string) => void;
  updateInstruction: (id: string, instruction: string) => void;

  openBrowser: (tabId: string) => Promise<void>;
  closeBrowser: () => Promise<void>;
  navigateBrowser: (tabId: string, url: string) => Promise<void>;
  takeSnapshot: (tabId: string) => Promise<void>;
  runAiAutomation: (tabId: string) => Promise<void>;
  stopAutomation: (tabId: string) => void;

  clickElement: (tabId: string, refId: string) => Promise<void>;
  fillElement: (tabId: string, refId: string, text: string) => Promise<void>;
  typeElement: (tabId: string, refId: string, text: string) => Promise<void>;
  pressKey: (tabId: string, key: string) => Promise<void>;

  addActionLog: (tabId: string, entry: ActionLogEntry) => void;
  clearActionLog: (tabId: string) => void;

  refreshBrowserStatus: () => Promise<void>;
}

function createAutomationTab(index: number): BrowserAutomationTab {
  return {
    id: `browser-auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `Crawl ${index}`,
    url: '',
    instruction: '',
    isRunning: false,
    snapshot: null,
    actions: [],
    discoveredApis: [],
  };
}

const DEFAULT_CRAWL_INSTRUCTION = [
  'Crawl the entire target.',
  'Discover routes, forms, authentication surfaces, API endpoints, and security-relevant behavior.',
  'Look for vulnerabilities such as missing access controls, exposed secrets, unsafe forms, injection points, XSS sinks, CSRF risk, open redirects, and sensitive data exposure.',
  'Return concise findings with evidence and next actions.',
].join(' ');

const initialTab = createAutomationTab(1);

export const useBrowserAutomationStore = create<BrowserAutomationState>((set, get) => ({
  tabs: [initialTab],
  activeTabId: initialTab.id,
  nextTabNumber: 2,
  browserStatus: null,

  setActiveTabId: (id) => set({ activeTabId: id }),

  addTab: () => {
    const { nextTabNumber } = get();
    const newTab = createAutomationTab(nextTabNumber);
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
      nextTabNumber: state.nextTabNumber + 1,
    }));
    return newTab.id;
  },

  closeTab: (id) =>
    set((state) => {
      const remainingTabs = state.tabs.filter((tab) => tab.id !== id);
      if (remainingTabs.length === 0) {
        const replacementTab = createAutomationTab(1);
        return {
          tabs: [replacementTab],
          activeTabId: replacementTab.id,
          nextTabNumber: 2,
        };
      }
      if (state.activeTabId === id) {
        return { tabs: remainingTabs, activeTabId: remainingTabs[0].id };
      }
      return { tabs: remainingTabs };
    }),

  renameTab: (id, name) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, name } : tab)),
    })),

  updateUrl: (id, url) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, url } : tab)),
    })),

  updateInstruction: (id, instruction) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, instruction } : tab)),
    })),

  refreshBrowserStatus: async () => {
    try {
      const status = await invoke<BrowserStatus>('get_browser_status');
      set({ browserStatus: status });
    } catch (error) {
      console.error('Failed to get browser status:', error);
    }
  },

  openBrowser: async (tabId) => {
    const tab = get().tabs.find((t) => t.id === tabId);
    if (!tab) return;

    try {
      get().addActionLog(tabId, { timestamp: new Date(), type: 'command', message: `Opening ${tab.url}...` });
      const status = await invoke<BrowserStatus>('browser_open', { url: tab.url });
      set({ browserStatus: status });
      get().addActionLog(tabId, { timestamp: new Date(), type: 'result', message: `Browser opened at ${tab.url}` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      get().addActionLog(tabId, { timestamp: new Date(), type: 'error', message: `Failed to open browser: ${msg}` });
    }
  },

  closeBrowser: async () => {
    try {
      const status = await invoke<BrowserStatus>('browser_close');
      set({ browserStatus: status });
      set((state) => ({
        tabs: state.tabs.map((tab) => ({ ...tab, snapshot: null })),
      }));
    } catch (error) {
      console.error('Failed to close browser:', error);
    }
  },

  navigateBrowser: async (tabId, url) => {
    try {
      get().addActionLog(tabId, { timestamp: new Date(), type: 'command', message: `Navigating to ${url}...` });
      await invoke('browser_navigate', { url });
      get().addActionLog(tabId, { timestamp: new Date(), type: 'result', message: `Navigated to ${url}` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      get().addActionLog(tabId, { timestamp: new Date(), type: 'error', message: `Navigate failed: ${msg}` });
    }
  },

  takeSnapshot: async (tabId) => {
    try {
      const snapshot = await invoke<BrowserSnapshot>('browser_snapshot');
      set((state) => ({
        tabs: state.tabs.map((tab) =>
          tab.id === tabId ? { ...tab, snapshot } : tab
        ),
      }));
      get().addActionLog(tabId, {
        timestamp: new Date(),
        type: 'result',
        message: `Snapshot: ${snapshot.title} (${snapshot.elements.length} elements)`,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      get().addActionLog(tabId, { timestamp: new Date(), type: 'error', message: `Snapshot failed: ${msg}` });
    }
  },

  runAiAutomation: async (tabId) => {
    const tab = get().tabs.find((t) => t.id === tabId);
    if (!tab) return;

    if (!tab.url.trim()) {
      get().addActionLog(tabId, {
        timestamp: new Date(),
        type: 'error',
        message: 'Target URL is required before starting a crawl.',
      });
      return;
    }

    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId
          ? {
            ...t,
            instruction: t.instruction || DEFAULT_CRAWL_INSTRUCTION,
            isRunning: true,
          }
          : t
      ),
    }));

    const instruction = tab.instruction || DEFAULT_CRAWL_INSTRUCTION;

    get().addActionLog(tabId, {
      timestamp: new Date(),
      type: 'ai',
      message: `Starting target crawl for ${tab.url}`,
    });

    try {
      const status = get().browserStatus;

      if (!status?.running) {
        get().addActionLog(tabId, {
          timestamp: new Date(),
          type: 'command',
          message: `Launching browser at ${tab.url}`,
        });
        const nextStatus = await invoke<BrowserStatus>('browser_open', { url: tab.url });
        set({ browserStatus: nextStatus });
        get().addActionLog(tabId, {
          timestamp: new Date(),
          type: 'result',
          message: `Browser ready at ${nextStatus.url || tab.url}`,
        });
      } else if (status.url !== tab.url) {
        await get().navigateBrowser(tabId, tab.url);
      }

      await get().takeSnapshot(tabId);
      const currentTab = get().tabs.find((t) => t.id === tabId);
      if (!currentTab?.snapshot) {
        get().addActionLog(tabId, { timestamp: new Date(), type: 'error', message: 'No snapshot available' });
        return;
      }

      const prompt = await invoke<string>('browser_execute', { instruction });
      get().addActionLog(tabId, {
        timestamp: new Date(),
        type: 'ai',
        message: `Vulnerability analysis prompt prepared (${prompt.length} characters).`,
      });

      get().addActionLog(tabId, {
        timestamp: new Date(),
        type: 'result',
        message: 'Crawl handoff complete. AI execution is pending Mastra integration.',
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      get().addActionLog(tabId, { timestamp: new Date(), type: 'error', message: `Crawl failed: ${msg}` });
    } finally {
      set((state) => ({
        tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, isRunning: false } : t)),
      }));
    }
  },

  stopAutomation: (tabId) => {
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, isRunning: false } : tab)),
    }));
  },

  clickElement: async (tabId, refId) => {
    try {
      get().addActionLog(tabId, { timestamp: new Date(), type: 'command', message: `Click @e${refId}` });
      await invoke('browser_click', { refId });
      get().addActionLog(tabId, { timestamp: new Date(), type: 'result', message: `Clicked @e${refId}` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      get().addActionLog(tabId, { timestamp: new Date(), type: 'error', message: `Click failed: ${msg}` });
    }
  },

  fillElement: async (tabId, refId, text) => {
    try {
      get().addActionLog(tabId, { timestamp: new Date(), type: 'command', message: `Fill @e${refId}: "${text}"` });
      await invoke('browser_fill', { refId, text });
      get().addActionLog(tabId, { timestamp: new Date(), type: 'result', message: `Filled @e${refId}` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      get().addActionLog(tabId, { timestamp: new Date(), type: 'error', message: `Fill failed: ${msg}` });
    }
  },

  typeElement: async (tabId, refId, text) => {
    try {
      get().addActionLog(tabId, { timestamp: new Date(), type: 'command', message: `Type @e${refId}: "${text}"` });
      await invoke('browser_type', { refId, text });
      get().addActionLog(tabId, { timestamp: new Date(), type: 'result', message: `Typed @e${refId}` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      get().addActionLog(tabId, { timestamp: new Date(), type: 'error', message: `Type failed: ${msg}` });
    }
  },

  pressKey: async (tabId, key) => {
    try {
      get().addActionLog(tabId, { timestamp: new Date(), type: 'command', message: `Press ${key}` });
      await invoke('browser_press', { key });
      get().addActionLog(tabId, { timestamp: new Date(), type: 'result', message: `Pressed ${key}` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      get().addActionLog(tabId, { timestamp: new Date(), type: 'error', message: `Press failed: ${msg}` });
    }
  },

  addActionLog: (tabId, entry) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, actions: [...tab.actions, entry] } : tab
      ),
    })),

  clearActionLog: (tabId) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, actions: [] } : tab)),
    })),
}));
