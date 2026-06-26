import { create } from 'zustand';

interface NavState {
  blinkingItems: Set<string>;
  triggerNavBlink: (href: string) => void;
  overviewSearchQuery: string;
  setOverviewSearchQuery: (query: string) => void;
}

export const useNavStore = create<NavState>()((set, get) => ({
  blinkingItems: new Set(),
  overviewSearchQuery: '',
  setOverviewSearchQuery: (overviewSearchQuery) => set({ overviewSearchQuery }),
  triggerNavBlink: (href: string) => {
    const current = get().blinkingItems;
    const next = new Set(current);
    next.add(href);
    set({ blinkingItems: next });

    setTimeout(() => {
      const updated = new Set(get().blinkingItems);
      updated.delete(href);
      set({ blinkingItems: updated });
    }, 6000);
  },
}));
