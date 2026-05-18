import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { getHttpLogs, type ProxyFilter } from '@/pages/http-history/api';

export { type ProxyStatus } from './app';

export interface FilterState {
  search: string;
  methods: Set<string>;
  statusCodes: Set<string>;
  pathFilter: string | null;
}

export function filterStateToProxyFilter(filter: FilterState, scope?: string[]): ProxyFilter {
  const methods = filter.methods.size > 0 ? Array.from(filter.methods) : null;
  let status_codes: number[] | null = null;

  if (filter.statusCodes.size > 0) {
    status_codes = [];
    for (const label of filter.statusCodes) {
      switch (label) {
        case '2xx': status_codes.push(200, 201, 202, 203, 204, 205, 206, 207, 208, 226); break;
        case '3xx': status_codes.push(300, 301, 302, 303, 304, 305, 306, 307, 308); break;
        case '4xx': status_codes.push(400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 421, 422, 423, 424, 425, 426, 428, 429, 431, 451); break;
        case '5xx': status_codes.push(500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511); break;
        default: {
          const num = parseInt(label, 10);
          if (!isNaN(num)) status_codes.push(num);
        }
      }
    }
    if (status_codes.length === 0) status_codes = null;
  }

  let search = filter.search || null;
  if (filter.pathFilter) {
    search = search ? `${search} ${filter.pathFilter}` : filter.pathFilter;
  }

  return {
    search,
    methods,
    status_codes,
    scope: scope && scope.length > 0 ? scope : null,
  };
}

interface LogState {
  selectedCallId: string | null;
  filter: FilterState;
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
  setFilter: (filter: FilterState) => void;
  setPathFilter: (path: string | null) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  toggleMethod: (method: string) => void;
  toggleStatus: (status: string) => void;
  clearFilters: () => void;

  clearCalls: () => Promise<void>;
  deleteCall: (id: string) => Promise<void>;
}

export const useHttpHistoryStore = create<LogState>()(
  (set, get) => ({
    selectedCallId: null,
    filter: {
      search: '',
      methods: new Set(),
      statusCodes: new Set(),
      pathFilter: null,
    },
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

    setFilter: (filter) => set({ filter }),

    setPathFilter: (path) => set((state) => ({
      filter: { ...state.filter, pathFilter: path }
    })),

    setSortOrder: (order) => set({ sortOrder: order }),

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
          pathFilter: null,
        },
      });
    },

    clearCalls: async () => {
      await invoke('clear_proxy_all');
      set({ pagination: { page: 1, perPage: 100, total: 0, hasMore: false } });
    },

    deleteCall: async (id) => {
      await invoke('delete_proxy_by_id', { logId: id });
    },
  })
);