import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { ApiCall, ProxyRecord, PaginatedResponse } from '@/types';
import type { HttpRequest } from '@/pages/brute-force/types';
import { getHttpLogs, type ProxyFilter } from '@/lib/api';

export type ProxyStatus = 'connected' | 'disconnected' | 'starting';

export interface FilterState {
  search: string;
  methods: Set<string>;
  statusCodes: Set<string>;
}

function adaptProxyRecordToApiCall(record: ProxyRecord): ApiCall {
  const uri = record.request.uri;
  const urlObj = uri.includes('://') ? new URL(uri) : null;
  return {
    id: record.id,
    session_id: '',
    target_id: '',
    timestamp: new Date(record.timestamp).getTime(),
    request_type: 'Other',
    method: record.request.method,
    url: uri,
    host: urlObj?.host || uri.split('://').pop()?.split('/')[0] || '',
    path: urlObj?.pathname || '/',
    query_params: {},
    headers: record.request.headers,
    cookies: {},
    request_body: new TextDecoder().decode(new Uint8Array(record.request.body)),
    request_body_size: record.request.body.length,
    response_status: record.response?.status_code ?? null,
    response_status_text: record.response?.status_text || null,
    response_headers: record.response?.headers || {},
    response_cookies: {},
    response_body: record.response ? new TextDecoder().decode(new Uint8Array(record.response.body)) : null,
    response_body_size: record.response?.body.length ?? 0,
    response_content_type: record.response?.headers['content-type'] || null,
    security_state: '',
    server_ip: record.server_addr || null,
    duration_ms: null,
  };
}

function filterStateToProxyFilter(filter: FilterState, scope?: string[]): ProxyFilter {
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

  return {
    search: filter.search || null,
    methods,
    status_codes,
    scope: scope && scope.length > 0 ? scope : null,
  };
}

interface HttpHistoryState {
  status: ProxyStatus;
  calls: ApiCall[];
  selectedCallId: string | null;
  filter: FilterState;
  pendingBruteForceRequest: HttpRequest | null;
  pagination: {
    page: number;
    perPage: number;
    total: number;
    hasMore: boolean;
  };
  isLoading: boolean;
  isLoadingMore: boolean;
  sortOrder: 'asc' | 'desc';
  setStatus: (status: ProxyStatus) => void;
  setCalls: (calls: ApiCall[]) => void;
  clearCalls: () => Promise<void>;
  setSelectedCallId: (id: string | null) => void;
  setFilter: (filter: FilterState) => void;
  toggleMethod: (method: string) => void;
  toggleStatus: (status: string) => void;
  clearFilters: () => void;
  fetchLogs: (scope?: string[]) => Promise<void>;
  loadMore: (scope?: string[]) => Promise<void>;
  getSelectedCall: () => ApiCall | null;
  startProxy: () => Promise<void>;
  setPendingBruteForceRequest: (request: HttpRequest | null) => void;
  addCall: (record: ProxyRecord) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  toggleSortOrder: () => void;
}

export const useHttpHistoryStore = create<HttpHistoryState>()(
  persist(
    (set, get) => ({
      status: 'disconnected',
      calls: [],
      selectedCallId: null,
      filter: {
        search: '',
        methods: new Set(),
        statusCodes: new Set(),
      },
      pendingBruteForceRequest: null,
      pagination: {
        page: 1,
        perPage: 100,
        total: 0,
        hasMore: false,
      },
      isLoading: false,
      isLoadingMore: false,
      sortOrder: 'desc',

      setStatus: (status) => set({ status }),

      setCalls: (calls) => set({ calls }),

      clearCalls: async () => {
        await invoke('clear_proxy_all');
        set({ calls: [], pagination: { page: 1, perPage: 100, total: 0, hasMore: false } });
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

      fetchLogs: async (scope?: string[]) => {
        const { filter, pagination, sortOrder } = get();
        set({ isLoading: true });
        try {
          const proxyFilter = filterStateToProxyFilter(filter, scope);
          const result = await getHttpLogs(1, pagination.perPage, proxyFilter, sortOrder);
          set({
            calls: result.data.map(adaptProxyRecordToApiCall),
            pagination: {
              ...pagination,
              page: 1,
              total: result.total,
              hasMore: result.has_more,
            },
          });
        } catch (error) {
          console.error('Failed to fetch logs:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      loadMore: async (scope?: string[]) => {
        const { filter, pagination, sortOrder, calls } = get();
        if (!pagination.hasMore || get().isLoadingMore) return;

        set({ isLoadingMore: true });
        try {
          const proxyFilter = filterStateToProxyFilter(filter, scope);
          const nextPage = pagination.page + 1;
          const result = await getHttpLogs(nextPage, pagination.perPage, proxyFilter, sortOrder);
          set({
            calls: [...calls, ...result.data.map(adaptProxyRecordToApiCall)],
            pagination: {
              ...pagination,
              page: nextPage,
              total: result.total,
              hasMore: result.has_more,
            },
          });
        } catch (error) {
          console.error('Failed to load more logs:', error);
        } finally {
          set({ isLoadingMore: false });
        }
      },

      getSelectedCall: () => {
        const { selectedCallId } = get();
        if (!selectedCallId) return null;
        const calls = get().calls;
        return calls.find((c) => c.id === selectedCallId) || null;
      },

      startProxy: async () => {
        set({ status: 'starting' });
        try {
          await invoke('start_proxy', { port: 8888, tls_port: 8889 });
          set({ status: 'connected' });
        } catch (error) {
          console.error('Failed to start proxy:', error);
          set({ status: 'disconnected' });
        }
      },

      setPendingBruteForceRequest: (request) => set({ pendingBruteForceRequest: request }),

      addCall: (record) => {
        const call = adaptProxyRecordToApiCall(record);
        set((state) => ({ calls: [call, ...state.calls] }));
      },

      setSortOrder: (order) => set({ sortOrder: order }),

      toggleSortOrder: () => {
        set((state) => ({
          sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc',
        }));
      },
    }),
    {
      name: 'apprecon-http-history',
      partialize: (state) => ({
        status: state.status,
      }),
    }
  )
);

export function useFilteredCalls(): ApiCall[] {
  return useHttpHistoryStore((state) => state.calls);
}