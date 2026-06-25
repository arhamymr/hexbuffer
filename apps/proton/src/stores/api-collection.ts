import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type {
  StashRecord,
  StashEndpointRecord,
  ContextRecord,
  ChronicleLogRecord,
  ActiveRequestState,
  ForgeResponse,
  KeyValuePair,
} from '@/pages/api-collection/types';

interface ApiCollectionState {
  stashes: StashRecord[];
  activeStashId: string | null;
  stashEndpoints: StashEndpointRecord[];
  activeEndpointId: string | null;
  contexts: ContextRecord[];
  activeContextId: string | null;
  chronicleLogs: ChronicleLogRecord[];
  
  // Active request builder state
  activeRequest: ActiveRequestState;

  // Actions
  fetchFromDb: () => Promise<void>;
  setActiveStashId: (id: string | null) => void;
  setActiveEndpointId: (id: string | null) => void;
  updateActiveRequest: (updater: (req: ActiveRequestState) => Partial<ActiveRequestState>) => void;
  
  // Stash (Workspace/Collection) Actions
  createStash: (name: string) => Promise<string>;
  renameStash: (id: string, name: string) => Promise<void>;
  deleteStash: (id: string) => Promise<void>;
  
  // Endpoint Actions
  createEndpoint: (stashId: string, name: string) => Promise<string>;
  saveActiveEndpoint: () => Promise<void>;
  deleteEndpoint: (id: string) => Promise<void>;

  // Context Actions
  createContext: (name: string, variables: Array<{ key: string; value: string }>) => Promise<void>;
  updateContext: (id: string, name: string, variables: Array<{ key: string; value: string }>) => Promise<void>;
  deleteContext: (id: string) => Promise<void>;
  setActiveContextId: (id: string | null) => void;

  // Chronicle Actions
  addChronicleRecord: (method: string, url: string, reqHeaders: string, reqBody: string, res: ForgeResponse) => Promise<void>;
  clearChronicle: () => Promise<void>;
}

const defaultActiveRequest: ActiveRequestState = {
  method: 'GET',
  url: 'https://httpbin.org/get',
  headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
  body: '',
  bodyType: 'none',
  preScript: '',
  testScript: '',
  response: null,
  isLoading: false,
  error: null,
  testResults: [],
};

export const useApiCollectionStore = create<ApiCollectionState>()(
  persist(
    (set, get) => ({
      stashes: [],
      activeStashId: null,
      stashEndpoints: [],
      activeEndpointId: null,
      contexts: [],
      activeContextId: null,
      chronicleLogs: [],
      activeRequest: { ...defaultActiveRequest },

      fetchFromDb: async () => {
        try {
          const [stashes, endpoints, contexts, logs] = await Promise.all([
            invoke<StashRecord[]>('get_stashes'),
            invoke<StashEndpointRecord[]>('get_stash_endpoints'),
            invoke<ContextRecord[]>('get_contexts'),
            invoke<ChronicleLogRecord[]>('get_chronicle_logs', { limit: 100 }),
          ]);

          let activeStashId = get().activeStashId;
          if (stashes.length > 0 && (!activeStashId || !stashes.some(s => s.id === activeStashId))) {
            activeStashId = stashes[0].id;
          }

          set({ stashes, stashEndpoints: endpoints, contexts, chronicleLogs: logs, activeStashId });
        } catch (e) {
          console.error('Failed to sync API Collection database:', e);
        }
      },

      setActiveStashId: (id) => {
        set({ activeStashId: id });
        // Select first endpoint inside this stash
        const endpoints = get().stashEndpoints.filter(e => e.stashId === id);
        if (endpoints.length > 0) {
          get().setActiveEndpointId(endpoints[0].id);
        } else {
          get().setActiveEndpointId(null);
        }
      },

      setActiveEndpointId: (id) => {
        if (!id) {
          set({ activeEndpointId: null, activeRequest: { ...defaultActiveRequest } });
          return;
        }
        const ep = get().stashEndpoints.find(e => e.id === id);
        if (ep) {
          const headers: KeyValuePair[] = ep.headers ? JSON.parse(ep.headers) : [];
          set({
            activeEndpointId: id,
            activeRequest: {
              method: ep.method,
              url: ep.url,
              headers,
              body: ep.body || '',
              bodyType: (ep.bodyType as any) || 'none',
              preScript: ep.preScript || '',
              testScript: ep.testScript || '',
              response: null,
              isLoading: false,
              error: null,
              testResults: [],
            }
          });
        }
      },

      updateActiveRequest: (updater) =>
        set((state) => ({
          activeRequest: { ...state.activeRequest, ...updater(state.activeRequest) },
        })),

      createStash: async (name) => {
        const id = crypto.randomUUID();
        const record: StashRecord = {
          id,
          name,
          parentId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          await invoke('save_stash', { record });
          await get().fetchFromDb();
          set({ activeStashId: id });
          return id;
        } catch (e: any) {
          console.error('Failed to create stash:', e);
          alert('Error: ' + (e.message || String(e)));
          throw e;
        }
      },

      renameStash: async (id, name) => {
        const stash = get().stashes.find(s => s.id === id);
        if (!stash) return;
        const record: StashRecord = {
          ...stash,
          name,
          updatedAt: new Date().toISOString(),
        };
        try {
          await invoke('save_stash', { record });
          await get().fetchFromDb();
        } catch (e: any) {
          console.error('Failed to rename stash:', e);
          alert('Error: ' + (e.message || String(e)));
        }
      },

      deleteStash: async (id) => {
        try {
          await invoke('delete_stash', { id });
          const remaining = get().stashes.filter(s => s.id !== id);
          const nextActiveId = remaining.length > 0 ? remaining[0].id : null;
          set({ activeStashId: nextActiveId });
          await get().fetchFromDb();
        } catch (e: any) {
          console.error('Failed to delete stash:', e);
          alert('Error: ' + (e.message || String(e)));
        }
      },

      createEndpoint: async (stashId, name) => {
        const id = crypto.randomUUID();
        const record: StashEndpointRecord = {
          id,
          stashId,
          name,
          method: 'GET',
          url: 'https://httpbin.org/get',
          headers: JSON.stringify([{ key: 'Accept', value: 'application/json', enabled: true }]),
          body: '',
          bodyType: 'none',
          preScript: '',
          testScript: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          await invoke('save_stash_endpoint', { record });
          await get().fetchFromDb();
          get().setActiveEndpointId(id);
          return id;
        } catch (e: any) {
          console.error('Failed to create endpoint:', e);
          alert('Error: ' + (e.message || String(e)));
          throw e;
        }
      },

      saveActiveEndpoint: async () => {
        const { activeEndpointId, activeRequest, stashEndpoints } = get();
        if (!activeEndpointId) return;
        const ep = stashEndpoints.find(e => e.id === activeEndpointId);
        if (!ep) return;

        const record: StashEndpointRecord = {
          ...ep,
          method: activeRequest.method,
          url: activeRequest.url,
          headers: JSON.stringify(activeRequest.headers),
          body: activeRequest.body,
          bodyType: activeRequest.bodyType,
          preScript: activeRequest.preScript,
          testScript: activeRequest.testScript,
          updatedAt: new Date().toISOString(),
        };
        try {
          await invoke('save_stash_endpoint', { record });
          await get().fetchFromDb();
        } catch (e: any) {
          console.error('Failed to save active endpoint:', e);
          alert('Error: ' + (e.message || String(e)));
        }
      },

      deleteEndpoint: async (id) => {
        try {
          await invoke('delete_stash_endpoint', { id });
          const { activeEndpointId, activeStashId, stashEndpoints } = get();
          if (activeEndpointId === id) {
            const siblings = stashEndpoints.filter(e => e.stashId === activeStashId && e.id !== id);
            if (siblings.length > 0) {
              get().setActiveEndpointId(siblings[0].id);
            } else {
              get().setActiveEndpointId(null);
            }
          }
          await get().fetchFromDb();
        } catch (e: any) {
          console.error('Failed to delete endpoint:', e);
          alert('Error: ' + (e.message || String(e)));
        }
      },

      createContext: async (name, variables) => {
        const record: ContextRecord = {
          id: crypto.randomUUID(),
          name,
          variables: JSON.stringify(variables),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          await invoke('save_context', { record });
          await get().fetchFromDb();
        } catch (e: any) {
          console.error('Failed to create context:', e);
          alert('Error: ' + (e.message || String(e)));
        }
      },

      updateContext: async (id, name, variables) => {
        const record: ContextRecord = {
          id,
          name,
          variables: JSON.stringify(variables),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          await invoke('save_context', { record });
          await get().fetchFromDb();
        } catch (e: any) {
          console.error('Failed to update context:', e);
          alert('Error: ' + (e.message || String(e)));
        }
      },

      deleteContext: async (id) => {
        try {
          await invoke('delete_context', { id });
          if (get().activeContextId === id) {
            set({ activeContextId: null });
          }
          await get().fetchFromDb();
        } catch (e: any) {
          console.error('Failed to delete context:', e);
          alert('Error: ' + (e.message || String(e)));
        }
      },

      setActiveContextId: (id) => set({ activeContextId: id }),

      addChronicleRecord: async (method, url, reqHeaders, reqBody, res) => {
        const record: ChronicleLogRecord = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          method,
          url,
          requestHeaders: reqHeaders,
          requestBody: reqBody,
          responseStatus: res.status,
          responseStatusText: res.statusText,
          responseHeaders: JSON.stringify(res.headers),
          responseBody: res.body,
          durationMs: res.timeMs,
        };
        try {
          await invoke('add_chronicle_log', { record });
          await get().fetchFromDb();
        } catch (e: any) {
          console.error('Failed to add chronicle record:', e);
        }
      },

      clearChronicle: async () => {
        try {
          await invoke('clear_chronicle_logs');
          await get().fetchFromDb();
        } catch (e: any) {
          console.error('Failed to clear chronicle:', e);
          alert('Error: ' + (e.message || String(e)));
        }
      },
    }),
    {
      name: 'hexbuffer-api-collection-v2',
      partialize: (state) => ({
        activeStashId: state.activeStashId,
        activeEndpointId: state.activeEndpointId,
        activeContextId: state.activeContextId,
      }),
    }
  )
);
