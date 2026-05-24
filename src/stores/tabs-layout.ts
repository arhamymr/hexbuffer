import { create } from 'zustand';

interface TabsLayoutState {
  activeTabIds: Record<string, string>;
  setActiveTabId: (scope: string, id: string) => void;
}

export const useTabsLayoutStore = create<TabsLayoutState>()((set) => ({
  activeTabIds: {},
  setActiveTabId: (scope, id) =>
    set((state) => ({
      activeTabIds: {
        ...state.activeTabIds,
        [scope]: id,
      },
    })),
}));
