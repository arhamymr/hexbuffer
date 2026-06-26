import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';

export { type ProxyStatus } from './app';

interface LogState {
  selectedCallId: string | null;
  pagination: {
    page: number;
    perPage: number;
    total: number;
    hasMore: boolean;
  };
  isLoading: boolean;
  isLoadingMore: boolean;
  sortOrder: 'asc' | 'desc';

  setSelectedCallId: (id: string | null) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  clearCalls: () => Promise<void>;
  deleteCall: (id: string) => Promise<void>;
}

export const useLogStore = create<LogState>()(
  (set) => ({
    selectedCallId: null,
    pagination: {
      page: 1,
      perPage: 100,
      total: 0,
      hasMore: false,
    },
    isLoading: false,
    isLoadingMore: false,
    sortOrder: 'desc',

    setSelectedCallId: (id) => set({ selectedCallId: id }),

    setSortOrder: (order) => set({ sortOrder: order }),

    clearCalls: async () => {
      await invoke('clear_proxy_all');
      set({ pagination: { page: 1, perPage: 100, total: 0, hasMore: false } });
    },

    deleteCall: async (id) => {
      await invoke('delete_proxy_by_id', { logId: id });
    },
  })
);