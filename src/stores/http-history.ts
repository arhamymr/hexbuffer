import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { ApiCall } from '@/types';
import type { HttpRequest } from '@/pages/brute-force/types';
import type { ProxyRecord } from '@/types';

export type ProxyStatus = 'connected' | 'disconnected' | 'starting';

export interface FilterState {
  search: string;
  methods: Set<string>;
  statusCodes: Set<string>;
}

interface ProxyFilter {
  search: string | null;
  methods: string[] | null;
  status_codes: number[] | null;
  scope: string[] | null;
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
  setStatus: (status: ProxyStatus) => void;
  setCalls: (calls: ApiCall[]) => void;
  clearCalls: () => Promise<void>;
  setSelectedCallId: (id: string | null) => void;
  setFilter: (filter: FilterState) => void;
  toggleMethod: (method: string) => void;
  toggleStatus: (status: string) => void;
  clearFilters: () => void;
  fetchFilteredCalls: (scope?: string[]) => Promise<void>;
  fetchCalls: () => Promise<void>;
  getSelectedCall: () => ApiCall | null;
  startProxy: () => Promise<void>;
  setPendingBruteForceRequest: (request: HttpRequest | null) => void;
  addCall: (record: ProxyRecord) => void;
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

      setStatus: (status) => set({ status }),

      setCalls: (calls) => set({ calls }),

      clearCalls: async () => {
        await invoke('clear_proxy_all');
        set({ calls: [] });
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

      fetchFilteredCalls: async (scope?: string[]) => {
        const filter = get().filter;
        const proxyFilter = filterStateToProxyFilter(filter, scope);
        const records = await invoke<ProxyRecord[]>('get_proxy_filtered', { filter: proxyFilter });
        const calls = records.map(adaptProxyRecordToApiCall);
        set({ calls });
      },

      fetchCalls: async () => {
        const records = await invoke<ProxyRecord[]>('get_proxy_all');
        const calls = records.map(adaptProxyRecordToApiCall);
        set({ calls });
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
          await invoke('start_proxy', { port: 8888 });
          set({ status: 'connected' });
        } catch (error) {
          console.error('Failed to start proxy:', error);
          set({ status: 'disconnected' });
        }
      },

      setPendingBruteForceRequest: (request) => set({ pendingBruteForceRequest: request }),

      addCall: (record) => {
        const call = adaptProxyRecordToApiCall(record);
        set((state) => ({ calls: [...state.calls, call] }));
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