import { create } from 'zustand';

interface FloatingBarUiState {
  isTargetSelectorOpen: boolean;
  setTargetSelectorOpen: (open: boolean) => void;
}

export const useFloatingBarUiStore = create<FloatingBarUiState>()((set) => ({
  isTargetSelectorOpen: false,
  setTargetSelectorOpen: (open) => set({ isTargetSelectorOpen: open }),
}));
