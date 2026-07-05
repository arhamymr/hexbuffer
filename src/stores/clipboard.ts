import { create } from 'zustand';

interface ClipboardState {
  history: string[];
  addClipboardItem: (text: string) => void;
  clearHistory: () => void;
}

// ponytail: simple localStorage helper for initializing clipboard history state
const getInitialState = (): string[] => {
  const saved = localStorage.getItem('desktop-clipboard-history');
  if (saved) {
    try {
      return JSON.parse(saved) as string[];
    } catch (e) {
      // Ignore parsing errors and fallback
    }
  }
  return [];
};

export const useClipboardStore = create<ClipboardState>()((set) => ({
  history: getInitialState(),

  addClipboardItem: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // ponytail: truncate extremely long text entries to prevent localStorage bloat or sluggish UI
    const finalVal = trimmed.length > 5000 ? trimmed.substring(0, 5000) + '...' : trimmed;

    set((state) => {
      // Move to top: remove duplicate item if it already exists, and prepend it
      const filtered = state.history.filter((item) => item !== finalVal);
      const newHistory = [finalVal, ...filtered].slice(0, 10);
      localStorage.setItem('desktop-clipboard-history', JSON.stringify(newHistory));
      return { history: newHistory };
    });
  },

  clearHistory: () => {
    localStorage.removeItem('desktop-clipboard-history');
    set({ history: [] });
  },
}));
