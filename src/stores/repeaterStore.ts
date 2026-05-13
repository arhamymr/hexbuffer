import { create } from 'zustand';
import type { RepeaterTab, RepeaterRequest, RepeaterResponse } from '@/pages/repeater/types';
import { createDefaultRepeaterTab } from '@/pages/repeater/types';

export function createTabFromApiCall(apiCall: {
  method: string;
  url: string;
  headers: Record<string, string>;
  request_body?: string | null;
}): RepeaterTab {
  const headersString = Object.entries(apiCall.headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const tab = createDefaultRepeaterTab(Date.now());

  return {
    ...tab,
    request: {
      method: apiCall.method,
      url: apiCall.url,
      headers: headersString,
      body: apiCall.request_body || '',
    },
  };
}

interface RepeaterState {
  tabs: RepeaterTab[];
  activeTabId: string | null;
  addTab: () => RepeaterTab;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateRequest: (tabId: string, updates: Partial<RepeaterRequest>) => void;
  setResponse: (tabId: string, response: RepeaterResponse | null) => void;
  setLoading: (tabId: string, isLoading: boolean) => void;
  setError: (tabId: string, error: string | null) => void;
  renameTab: (tabId: string, name: string) => void;
  getActiveTab: () => RepeaterTab | null;
}

export const useRepeaterStore = create<RepeaterState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: () => {
    const tabs = get().tabs;
    const newTab = createDefaultRepeaterTab(tabs.length + 1);

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));

    return newTab;
  },

  removeTab: (tabId) => {
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== tabId);
      let newActiveTabId = state.activeTabId;

      if (state.activeTabId === tabId) {
        const removedIndex = state.tabs.findIndex((t) => t.id === tabId);
        if (newTabs.length === 0) {
          newActiveTabId = null;
        } else if (removedIndex === 0) {
          newActiveTabId = newTabs[0].id;
        } else {
          newActiveTabId = newTabs[removedIndex - 1]?.id || newTabs[0]?.id || null;
        }
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveTabId,
      };
    });
  },

  setActiveTab: (tabId) => {
    set({ activeTabId: tabId });
  },

  updateRequest: (tabId, updates) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId
          ? { ...tab, request: { ...tab.request, ...updates } }
          : tab
      ),
    }));
  },

  setResponse: (tabId, response) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId
          ? { ...tab, response, isLoading: false, error: null }
          : tab
      ),
    }));
  },

  setLoading: (tabId, isLoading) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId
          ? { ...tab, isLoading }
          : tab
      ),
    }));
  },

  setError: (tabId, error) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId
          ? { ...tab, error, isLoading: false }
          : tab
      ),
    }));
  },

  renameTab: (tabId, name) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, name } : tab
      ),
    }));
  },

  getActiveTab: () => {
    const state = get();
    return state.tabs.find((t) => t.id === state.activeTabId) || null;
  },
}));