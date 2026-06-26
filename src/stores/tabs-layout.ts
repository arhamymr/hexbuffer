import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TabsLayoutState {
  activeTabIds: Record<string, string>;
  setActiveTabId: (scope: string, id: string) => void;
}

export const useTabsLayoutStore = create<TabsLayoutState>()(
  persist(
    (set) => ({
      activeTabIds: {},
      setActiveTabId: (scope, id) =>
        set((state) => ({
          activeTabIds: {
            ...state.activeTabIds,
            [scope]: id,
          },
        })),
    }),
    {
      name: 'hexbuffer-tabs-layout',
      partialize: (state) => ({
        activeTabIds: state.activeTabIds,
      }),
    }
  )
);
