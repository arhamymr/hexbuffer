import { create } from 'zustand';
import type { Target } from '@/types';

export type FilterMode = 'scoped' | 'all';

interface ProxyState {
  selectedTarget: Target | null;
  filterMode: FilterMode;
  setSelectedTarget: (target: Target | null) => void;
  setFilterMode: (mode: FilterMode) => void;
  clearTarget: () => void;
}

export const useProxyStore = create<ProxyState>((set) => ({
  selectedTarget: null,
  filterMode: 'scoped',

  setSelectedTarget: (target) => set({ selectedTarget: target }),

  setFilterMode: (mode) => set({ filterMode: mode }),

  clearTarget: () => set({ selectedTarget: null }),
}));