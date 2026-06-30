import { create } from 'zustand';

interface ScratchpadState {
  note: string;
  setNote: (note: string) => void;
}

export const useScratchpadStore = create<ScratchpadState>()((set) => ({
  note: localStorage.getItem('desktop-scratchpad') ?? '',
  setNote: (note) => {
    localStorage.setItem('desktop-scratchpad', note);
    set({ note });
  },
}));
