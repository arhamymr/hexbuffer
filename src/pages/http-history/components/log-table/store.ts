import { create } from 'zustand';
import { useHttpHistoryStore } from '@/stores/http-history';
import type { ApiCall } from '@/types';
import type { FilterState } from './types';

interface LogTableState {
  selectedCallId: string | null;
  filter: FilterState;
  setSelectedCallId: (id: string | null) => void;
  setFilter: (filter: FilterState) => void;
  toggleMethod: (method: string) => void;
  toggleStatus: (status: string) => void;
  clearFilters: () => void;
  clearCalls: () => void;
  getSelectedCall: () => ApiCall | null;
}

export const useLogTableStore = create<LogTableState>((set, get) => ({
  selectedCallId: null,
  filter: {
    search: '',
    methods: new Set(),
    statusCodes: new Set(),
  },

  setSelectedCallId: (id) => set({ selectedCallId: id }),

  setFilter: (filter) => set({ filter }),

  toggleMethod: (method) => {
    set((state) => {
      const next = new Set(state.filter.methods);
      if (next.has(method)) {
        next.delete(method);
      } else {
        next.add(method);
      }
      return { filter: { ...state.filter, methods: next } };
    });
  },

  toggleStatus: (status) => {
    set((state) => {
      const next = new Set(state.filter.statusCodes);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return { filter: { ...state.filter, statusCodes: next } };
    });
  },

  clearFilters: () => {
    set({
      filter: {
        search: '',
        methods: new Set(),
        statusCodes: new Set(),
      },
    });
  },

  clearCalls: () => {
    useHttpHistoryStore.getState().clearCalls();
  },

  getSelectedCall: () => {
    const { selectedCallId } = get();
    if (!selectedCallId) return null;
    const calls = useHttpHistoryStore.getState().calls;
    return calls.find((c) => c.id === selectedCallId) || null;
  },
}));

export function useFilteredCalls(): ApiCall[] {
  const calls = useHttpHistoryStore((state) => state.calls);
  const filter = useLogTableStore((state) => state.filter);

  return calls.filter((call) => {
    if (filter.methods.size > 0 && !filter.methods.has(call.method)) {
      return false;
    }
    if (filter.statusCodes.size > 0) {
      const status = call.response_status ? String(call.response_status) : 'null';
      if (!filter.statusCodes.has(status)) {
        return false;
      }
    }
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      return (
        call.url.toLowerCase().includes(searchLower) ||
        call.host.toLowerCase().includes(searchLower) ||
        call.path.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });
}