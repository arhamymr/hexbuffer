import { create } from 'zustand';

interface ToolsState {
  activeTabOverride: string | null;
  consumeActiveTabOverride: () => string | null;
}

export const useToolsStore = create<ToolsState>((set, get) => ({
  activeTabOverride: null,

  consumeActiveTabOverride: () => {
    const value = get().activeTabOverride;
    if (value !== null) set({ activeTabOverride: null });
    return value;
  },
}));
