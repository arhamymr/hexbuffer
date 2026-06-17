import { create } from 'zustand';

interface ChatboxStore {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

export const useChatboxStore = create<ChatboxStore>()((set) => ({
  isOpen: false,
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  close: () => set({ isOpen: false }),
}));
