import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  createDefaultRepeaterTab,
  createRepeaterTabFromRequest,
  type RepeaterRequest,
  type RepeaterTab,
} from '@/pages/repeater/types';

interface RepeaterState {
  tabs: RepeaterTab[];
  activeTabId: string;
  nextRequestTabNumber: number;
  setActiveTabId: (id: string) => void;
  updateTab: (id: string, updater: (tab: RepeaterTab) => RepeaterTab) => void;
  renameTab: (id: string, name: string) => void;
  addRequestTab: (request: RepeaterRequest) => string;
  closeTab: (id: string) => void;
}

const initialTab = createDefaultRepeaterTab(1);

function getNextRequestTabNumber(tabs: RepeaterTab[]): number {
  const numericNames = tabs
    .map((tab) => Number(tab.name))
    .filter((name) => Number.isInteger(name) && name > 0);

  return numericNames.length > 0 ? Math.max(...numericNames) + 1 : 1;
}

export const useRepeaterStore = create<RepeaterState>()(
  persist(
    (set) => ({
      tabs: [initialTab],
      activeTabId: initialTab.id,
      nextRequestTabNumber: 1,
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
    }),
    {
      name: 'apprecon-repeater',
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        nextRequestTabNumber: state.nextRequestTabNumber,
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
        };
      },
    }
  )
);
