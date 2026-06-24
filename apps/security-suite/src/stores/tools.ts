import { create } from 'zustand';

interface ToolsState {
  pendingScriptInput: string | null;
  activeTabOverride: string | null;
  sendToScriptAnalyzer: (text: string) => void;
  consumePendingScriptInput: () => string | null;
  consumeActiveTabOverride: () => string | null;
}

export const useToolsStore = create<ToolsState>((set, get) => ({
  pendingScriptInput: null,
  activeTabOverride: null,

  sendToScriptAnalyzer: (text) => {
    set({ pendingScriptInput: text, activeTabOverride: 'shell' });
  },

  consumePendingScriptInput: () => {
    const value = get().pendingScriptInput;
    if (value !== null) set({ pendingScriptInput: null });
    return value;
  },

  consumeActiveTabOverride: () => {
    const value = get().activeTabOverride;
    if (value !== null) set({ activeTabOverride: null });
    return value;
  },
}));
