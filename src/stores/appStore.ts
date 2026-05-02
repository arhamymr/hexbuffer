import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { Target } from '@/types';
import type { HttpRequestTemplate } from '@/components/repeater/types';

export interface Tab {
  id: string;
  targetId: string;
  targetName: string;
}

interface AppState {
  targets: Target[];
  selectedTarget: Target | null;
  routeTabs: Record<string, Tab[]>;
  activeTabId: Record<string, string>;
  pendingRepeaterRequest: HttpRequestTemplate | null;
  pendingBruteForceRequest: HttpRequestTemplate | null;
  fetchTargets: () => Promise<void>;
  selectTarget: (target: Target | null) => void;
  addTab: (route: string, target: Target) => void;
  removeTab: (route: string, tabId: string) => void;
  setActiveTab: (route: string, tabId: string) => void;
  clearRouteTabs: (route: string) => void;
  getRouteTabs: (route: string) => Tab[];
  getActiveTab: (route: string) => Tab | null;
  setPendingRepeaterRequest: (request: HttpRequestTemplate | null) => void;
  setPendingBruteForceRequest: (request: HttpRequestTemplate | null) => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      targets: [],
      selectedTarget: null,
      routeTabs: {},
      activeTabId: {},
      pendingRepeaterRequest: null,
      pendingBruteForceRequest: null,

      fetchTargets: async () => {
        try {
          const data = await invoke<Target[]>('get_targets');
          set({ targets: data });
        } catch (e) {
          console.error('Failed to fetch targets:', e);
        }
      },

      selectTarget: (target) => {
        set({ selectedTarget: target, routeTabs: {}, activeTabId: {} });
      },

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
            ...state,
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

      setPendingRepeaterRequest: (request) => {
        set({ pendingRepeaterRequest: request });
      },

      setPendingBruteForceRequest: (request) => {
        set({ pendingBruteForceRequest: request });
      },
    }),
    {
      name: 'apprecon-tabs',
      partialize: (state) => ({
        routeTabs: state.routeTabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);