import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  createDefaultRepeaterTab,
  createRepeaterTabFromRequest,
  createWsRepeaterTab,
  type RepeaterRequest,
  type RepeaterWsRequest,
  type RepeaterTab,
} from '@/pages/repeater/types';

interface RepeaterState {
  tabs: RepeaterTab[];
  activeTabId: string;
  nextRequestTabNumber: number;
  nextWsTabNumber: number;
  setActiveTabId: (id: string) => void;
  updateTab: (id: string, updater: (tab: RepeaterTab) => RepeaterTab) => void;
  renameTab: (id: string, name: string) => void;
  addRequestTab: (request: RepeaterRequest) => string;
  addWsTab: (wsRequest: RepeaterWsRequest) => string;
  closeTab: (id: string) => void;
  closeTabsToLeft: (id: string) => void;
  closeTabsToRight: (id: string) => void;
}

const initialTab = createDefaultRepeaterTab(1);

function getNextRequestTabNumber(tabs: RepeaterTab[]): number {
  const numericNames = tabs
    .map((tab) => Number(tab.name))
    .filter((name) => Number.isInteger(name) && name > 0);

  return numericNames.length > 0 ? Math.max(...numericNames) + 1 : 1;
}

function getNextWsTabNumber(tabs: RepeaterTab[]): number {
  const wsTabs = tabs.filter((tab) => tab.mode === 'websocket');
  return wsTabs.length + 1;
}

export const useRepeaterStore = create<RepeaterState>()(
  persist(
    (set) => ({
      tabs: [initialTab],
      activeTabId: initialTab.id,
      nextRequestTabNumber: 1,
      nextWsTabNumber: 1,
      setActiveTabId: (id) => set({ activeTabId: id }),
      updateTab: (id, updater) =>
        set((state) => ({
          tabs: state.tabs.map((tab) => (tab.id === id ? updater(tab) : tab)),
        })),
      renameTab: (id, name) =>
        set((state) => ({
          tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, name } : tab)),
        })),
      addRequestTab: (request) => {
        const { nextRequestTabNumber } = useRepeaterStore.getState();
        const newTab = createRepeaterTabFromRequest(request, String(nextRequestTabNumber));

        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
          nextRequestTabNumber: state.nextRequestTabNumber + 1,
        }));

        return newTab.id;
      },
      addWsTab: (wsRequest) => {
        const { nextWsTabNumber } = useRepeaterStore.getState();
        const newTab = createWsRepeaterTab(wsRequest, nextWsTabNumber);

        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
          nextWsTabNumber: state.nextWsTabNumber + 1,
        }));

        return newTab.id;
      },
      closeTab: (id) =>
        set((state) => {
          const remainingTabs = state.tabs.filter((tab) => tab.id !== id);

          if (remainingTabs.length === 0) {
            const replacementTab = createDefaultRepeaterTab(1);
            return {
              tabs: [replacementTab],
              activeTabId: replacementTab.id,
            };
          }

          if (state.activeTabId !== id) {
            return { tabs: remainingTabs };
          }

          const closedTabIndex = state.tabs.findIndex((tab) => tab.id === id);
          const nextActiveTab = remainingTabs[Math.max(0, closedTabIndex - 1)] ?? remainingTabs[0];

          return {
            tabs: remainingTabs,
            activeTabId: nextActiveTab.id,
          };
        }),
      closeTabsToLeft: (id) =>
        set((state) => {
          const tabIndex = state.tabs.findIndex((tab) => tab.id === id);

          if (tabIndex <= 0) {
            return state;
          }

          const tabs = state.tabs.slice(tabIndex);
          const activeTabId = tabs.some((tab) => tab.id === state.activeTabId)
            ? state.activeTabId
            : id;

          return { tabs, activeTabId };
        }),
      closeTabsToRight: (id) =>
        set((state) => {
          const tabIndex = state.tabs.findIndex((tab) => tab.id === id);

          if (tabIndex === -1 || tabIndex === state.tabs.length - 1) {
            return state;
          }

          const tabs = state.tabs.slice(0, tabIndex + 1);
          const activeTabId = tabs.some((tab) => tab.id === state.activeTabId)
            ? state.activeTabId
            : id;

          return { tabs, activeTabId };
        }),
    }),
    {
      name: '0xbuffer-repeater',
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        nextRequestTabNumber: state.nextRequestTabNumber,
        nextWsTabNumber: state.nextWsTabNumber,
      }),
      merge: (persistedState, currentState) => {
        const typedState = persistedState as Partial<RepeaterState> | undefined;
        const persistedTabs = typedState?.tabs?.length ? typedState.tabs : currentState.tabs;
        const persistedActiveTabId = typedState?.activeTabId;
        const activeTabId = persistedTabs.some((tab) => tab.id === persistedActiveTabId)
          ? persistedActiveTabId!
          : persistedTabs[0].id;

        return {
          ...currentState,
          ...typedState,
          tabs: persistedTabs,
          activeTabId,
          nextRequestTabNumber: typedState?.nextRequestTabNumber ?? getNextRequestTabNumber(persistedTabs),
          nextWsTabNumber: typedState?.nextWsTabNumber ?? getNextWsTabNumber(persistedTabs),
        };
      },
    }
  )
);
