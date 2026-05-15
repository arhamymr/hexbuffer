import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { ApiCall, Target } from '@/types';
import type { HttpRequest } from '@/pages/brute-force/types';

export type ProxyStatus = 'connected' | 'disconnected' | 'starting';

export interface Tab {
  id: string;
  targetId: string;
  targetName: string;
}

interface HttpHistoryState {
  status: ProxyStatus;
  port: number;
  calls: ApiCall[];
  targets: Target[];
  routeTabs: Record<string, Tab[]>;
  activeTabId: Record<string, string>;
  pendingBruteForceRequest: HttpRequest | null;
  setStatus: (status: ProxyStatus) => void;
  setCalls: (calls: ApiCall[]) => void;
  clearCalls: () => void;
  fetchTargets: () => Promise<void>;
  addTarget: (target: Target) => void;
  removeTarget: (targetId: string) => void;
  updateTarget: (targetId: string, updates: Partial<Target>) => void;
  addTab: (route: string, target: Target) => void;
  removeTab: (route: string, tabId: string) => void;
  setActiveTab: (route: string, tabId: string) => void;
  clearRouteTabs: (route: string) => void;
  getRouteTabs: (route: string) => Tab[];
  getActiveTab: (route: string) => Tab | null;
  startProxy: () => Promise<void>;
  setPendingBruteForceRequest: (request: HttpRequest | null) => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export const useHttpHistoryStore = create<HttpHistoryState>()(
  persist(
    (set, get) => ({
      status: 'disconnected',
      port: 8888,
      calls: [],
      targets: [],
      routeTabs: {},
      activeTabId: {},
      pendingBruteForceRequest: null,

      setStatus: (status) => set({ status }),

      setCalls: (calls) => set({ calls }),
      clearCalls: () => set({ calls: [] }),

      startProxy: async () => {
        set({ status: 'starting' });
        try {
          await invoke('start_proxy', { port: get().port });
          set({ status: 'connected' });
        } catch (error) {
          console.error('Failed to start proxy:', error);
          set({ status: 'disconnected' });
        }
      },

      fetchTargets: async () => {
        try {
          const targets = await invoke<Target[]>('get_targets');
          set({ targets });
        } catch (error) {
          console.error('Failed to fetch targets:', error);
        }
      },

      addTarget: (target) =>
        set((state) => ({ targets: [...state.targets, target] })),

      removeTarget: (targetId) =>
        set((state) => ({
          targets: state.targets.filter((t) => t.id !== targetId),
        })),

      updateTarget: (targetId, updates) =>
        set((state) => ({
          targets: state.targets.map((t) =>
            t.id === targetId ? { ...t, ...updates } : t
          ),
        })),

      getRouteTabs: (route) => {
        return get().routeTabs[route] || [];
      },

      getActiveTab: (route) => {
        const tabs = get().routeTabs[route] || [];
        const activeId = get().activeTabId[route];
        if (!activeId) return tabs[0] || null;
        return tabs.find(t => t.id === activeId) || tabs[0] || null;
      },

      addTab: (route, target) => {
        set((state) => {
          const existing = state.routeTabs[route] || [];
          const alreadyExists = existing.find(t => t.targetId === target.id);
          if (alreadyExists) {
            return {
              ...state,
              activeTabId: { ...state.activeTabId, [route]: alreadyExists.id },
            };
          }
          const newTab: Tab = {
            id: generateId(),
            targetId: target.id,
            targetName: target.name,
          };
          return {
            routeTabs: { ...state.routeTabs, [route]: [...existing, newTab] },
            activeTabId: { ...state.activeTabId, [route]: newTab.id },
          };
        });
      },

      removeTab: (route, tabId) => {
        set((state) => {
          const tabs = state.routeTabs[route] || [];
          const newTabs = tabs.filter(t => t.id !== tabId);

          let newActiveTabId = state.activeTabId[route];
          if (state.activeTabId[route] === tabId) {
            if (newTabs.length === 0) {
              newActiveTabId = undefined as unknown as string;
            } else {
              const removedIndex = tabs.findIndex(t => t.id === tabId);
              const newActiveIndex = removedIndex === 0 ? 0 : removedIndex - 1;
              newActiveTabId = newTabs[newActiveIndex].id;
            }
          }

          const newRouteTabs = { ...state.routeTabs };
          if (newTabs.length === 0) {
            delete newRouteTabs[route];
          } else {
            newRouteTabs[route] = newTabs;
          }

          const newActiveTabIdMap = { ...state.activeTabId };
          if (newActiveTabId === undefined) {
            delete newActiveTabIdMap[route];
          } else {
            newActiveTabIdMap[route] = newActiveTabId;
          }

          return {
            routeTabs: newRouteTabs,
            activeTabId: newActiveTabIdMap,
          };
        });
      },

      setActiveTab: (route, tabId) => {
        set((state) => ({
          activeTabId: { ...state.activeTabId, [route]: tabId },
        }));
      },

      clearRouteTabs: (route) => {
        set((state) => {
          const newRouteTabs = { ...state.routeTabs };
          delete newRouteTabs[route];
          const newActiveTabId = { ...state.activeTabId };
          delete newActiveTabId[route];
          return { routeTabs: newRouteTabs, activeTabId: newActiveTabId };
        });
      },

      setPendingBruteForceRequest: (request) => set({ pendingBruteForceRequest: request }),
    }),
    {
      name: 'apprecon-http-history',
      partialize: (state) => ({
        status: state.status,
        port: state.port,
        targets: state.targets,
        routeTabs: state.routeTabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);