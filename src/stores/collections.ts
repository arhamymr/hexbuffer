import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

// ── Types (mirroring Rust StashRecord, StashEndpointRecord, etc.) ──

export interface StashRecord {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface StashEndpointRecord {
  id: string;
  stashId: string;
  name: string;
  method: string;
  url: string;
  headers: string | null; // JSON string of KeyValuePair[]
  body: string | null;
  bodyType: string | null; // 'none' | 'raw' | 'json' | 'form-data'
  preScript: string | null;
  testScript: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContextRecord {
  id: string;
  name: string;
  variables: string; // JSON string of {key, value}[]
  createdAt: string;
  updatedAt: string;
}

export interface ChronicleLogRecord {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  requestHeaders: string | null;
  requestBody: string | null;
  responseStatus: number | null;
  responseStatusText: string | null;
  responseHeaders: string | null;
  responseBody: string | null;
  durationMs: number | null;
}

export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

export interface ForgeResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  timeMs: number;
  finalUrl: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export interface ActiveRequestState {
  method: string;
  url: string;
  headers: KeyValuePair[];
  body: string;
  bodyType: 'none' | 'raw' | 'json' | 'form-data';
  preScript: string;
  testScript: string;
  response: ForgeResponse | null;
  isLoading: boolean;
  error: string | null;
  testResults: TestResult[];
  queryParams: KeyValuePair[];
}

interface ForgeRequestPayload {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

// ── Helpers ──

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function timestampNow(): string {
  return new Date().toISOString();
}

function parseQueryParams(url: string): KeyValuePair[] {
  if (!url || !url.includes('?')) return [];
  try {
    const queryString = url.substring(url.indexOf('?') + 1);
    if (!queryString) return [];
    const params: KeyValuePair[] = [];
    const pairs = queryString.split('&');
    for (const pair of pairs) {
      if (!pair) continue;
      const eqIdx = pair.indexOf('=');
      let key = eqIdx !== -1 ? pair.substring(0, eqIdx) : pair;
      let value = eqIdx !== -1 ? pair.substring(eqIdx + 1) : '';
      try {
        key = decodeURIComponent(key);
      } catch {}
      try {
        value = decodeURIComponent(value);
      } catch {}
      params.push({ key, value, enabled: true });
    }
    return params;
  } catch {
    return [];
  }
}

function defaultActiveRequest(): ActiveRequestState {
  return {
    method: 'GET',
    url: '',
    headers: [],
    body: '',
    bodyType: 'none',
    preScript: '',
    testScript: '',
    response: null,
    isLoading: false,
    error: null,
    testResults: [],
    queryParams: [],
  };
}

// ── Store ──

interface CollectionsState {
  // Persisted data
  stashes: StashRecord[];
  endpoints: StashEndpointRecord[];
  contexts: ContextRecord[];
  chronicleLogs: ChronicleLogRecord[];

  // Selection
  selectedNodeId: string | null;
  activeContextId: string | null;

  // Active request (in-memory, NOT persisted)
  activeRequest: ActiveRequestState;

  // Hydration
  isHydrated: boolean;
  fetchFromDb: () => Promise<void>;

  // Mode
  mode: 'repeater' | 'craft';
  setMode: (mode: 'repeater' | 'craft') => void;

  // Stash CRUD
  setSelectedNodeId: (id: string | null) => void;
  setActiveContextId: (id: string | null) => void;
  createStash: (name: string, workspaceId?: string, id?: string) => Promise<string>;
  renameStash: (id: string, name: string) => Promise<void>;
  deleteStash: (id: string) => Promise<void>;
  moveStash: (id: string, newSortOrder?: number, newParentId?: string | null) => Promise<void>;

  // Endpoint CRUD
  setActiveEndpointId: (id: string) => void;
  createEndpoint: (stashId: string, name: string) => Promise<string>;
  renameEndpoint: (id: string, name: string) => Promise<void>;
  deleteEndpoint: (id: string) => Promise<void>;
  moveEndpoint: (id: string, newStashId: string, newSortOrder?: number) => Promise<void>;
  saveActiveEndpoint: () => Promise<void>;
  updateActiveRequest: (
    updater: (req: ActiveRequestState) => Partial<ActiveRequestState>
  ) => void;

  // Context CRUD
  createContext: (name: string, variables: KeyValuePair[]) => Promise<void>;
  updateContext: (id: string, name: string, variables: KeyValuePair[]) => Promise<void>;
  deleteContext: (id: string) => Promise<void>;

  // Chronicle
  addChronicleRecord: (
    method: string,
    url: string,
    requestHeaders: string,
    requestBody: string,
    response: ForgeResponse,
  ) => Promise<void>;
  clearChronicle: () => Promise<void>;

  // Forge send
  sendForgeRequest: (payload: ForgeRequestPayload) => Promise<ForgeResponse>;

  // Import / Export
  clearAllCollections: (workspaceId?: string) => Promise<void>;
  batchImportCollections: (
    stashes: StashRecord[],
    endpoints: StashEndpointRecord[],
    workspaceId?: string,
  ) => Promise<{ stashesImported: number; endpointsImported: number; errors: string[] }>;
}

function getWorkspaceStashIds(stashes: StashRecord[], workspaceId: string): Set<string> {
  const wsStashIds = new Set<string>();
  const addDescendants = (parentId: string) => {
    wsStashIds.add(parentId);
    const children = stashes.filter((st) => st.parentId === parentId);
    for (const child of children) {
      addDescendants(child.id);
    }
  };
  const roots = stashes.filter((st) => st.parentId === workspaceId);
  for (const root of roots) {
    addDescendants(root.id);
  }
  return wsStashIds;
}

export const useCollectionsStore = create<CollectionsState>()(
  (set, get) => ({
    stashes: [],
    endpoints: [],
    contexts: [],
    chronicleLogs: [],

    selectedNodeId: null,
    activeContextId: null,

    activeRequest: defaultActiveRequest(),

    isHydrated: false,

    mode: 'repeater',

    setMode: (mode) => set({ mode }),

    // ── Hydration ──
    fetchFromDb: async () => {
      try {
        const [stashes, endpoints, contexts, chronicleLogs] = await Promise.all([
          invoke<StashRecord[]>('get_stashes'),
          invoke<StashEndpointRecord[]>('get_stash_endpoints'),
          invoke<ContextRecord[]>('get_contexts'),
          invoke<ChronicleLogRecord[]>('get_chronicle_logs', { limit: 500 }),
        ]);
        set({ stashes, endpoints, contexts, chronicleLogs, isHydrated: true });
      } catch (e) {
        console.error('Failed to load collections from DB:', e);
        set({ isHydrated: true });
      }
    },

    // ── Selection ──
    setSelectedNodeId: (id) => set({ selectedNodeId: id }),
    setActiveContextId: (id) => set({ activeContextId: id }),

    // ── Stash CRUD ──
    createStash: async (name, workspaceId, id) => {
      const now = timestampNow();
      const stash: StashRecord = {
        id: id ?? generateId(),
        name,
        parentId: workspaceId ?? null,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await invoke('save_stash', { record: stash });
      } catch (e) {
        console.error('Failed to save stash:', e);
      }
      set((s) => ({ stashes: [...s.stashes, stash], selectedNodeId: `stash-${stash.id}` }));
      return stash.id;
    },

    renameStash: async (id, name) => {
      const now = timestampNow();
      set((s) => ({
        stashes: s.stashes.map((st) =>
          st.id === id ? { ...st, name, updatedAt: now } : st
        ),
      }));
      const updated = get().stashes.find((s) => s.id === id);
      if (updated) {
        try {
          await invoke('save_stash', { record: updated });
        } catch (e) {
          console.error('Failed to rename stash:', e);
        }
      }
    },

    deleteStash: async (id) => {
      const getDescendantStashIds = (stashId: string): string[] => {
        const descendants = [stashId];
        const children = get().stashes.filter((st) => st.parentId === stashId);
        for (const child of children) {
          descendants.push(...getDescendantStashIds(child.id));
        }
        return descendants;
      };

      const stashesToDelete = getDescendantStashIds(id);
      const stashDeleteSet = new Set(stashesToDelete);

      set((s) => ({
        stashes: s.stashes.filter((st) => !stashDeleteSet.has(st.id)),
        endpoints: s.endpoints.filter((ep) => !stashDeleteSet.has(ep.stashId)),
      }));

      for (const stashId of stashesToDelete) {
        try {
          await invoke('delete_stash', { id: stashId });
        } catch (e) {
          console.error(`Failed to delete stash ${stashId}:`, e);
        }
      }
    },

    moveStash: async (id, newSortOrder, newParentId) => {
      const now = timestampNow();
      set((s) => ({
        stashes: s.stashes.map((st) =>
          st.id === id
            ? {
                ...st,
                sortOrder: newSortOrder !== undefined ? newSortOrder : st.sortOrder,
                parentId: newParentId !== undefined ? newParentId : st.parentId,
                updatedAt: now,
              } as StashRecord
            : st
        ),
      }));
      const updated = get().stashes.find((s) => s.id === id);
      if (updated) {
        try {
          await invoke('save_stash', { record: updated });
        } catch (e) {
          console.error('Failed to move stash:', e);
        }
      }
    },

    // ── Endpoint CRUD ──
    setActiveEndpointId: (id) => {
      set({ selectedNodeId: `ep-${id}` });
      const ep = get().endpoints.find((e) => e.id === id);
      if (ep) {
        let parsedHeaders: KeyValuePair[] = [];
        try {
          if (ep.headers) {
            const obj = JSON.parse(ep.headers);
            parsedHeaders = Object.entries(obj).map(([key, value]) => ({
              key,
              value: value as string,
              enabled: true,
            }));
          }
        } catch { /* ignore */ }

        set({
          activeRequest: {
            method: ep.method || 'GET',
            url: ep.url || '',
            headers: parsedHeaders,
            body: ep.body || '',
            bodyType: (ep.bodyType as ActiveRequestState['bodyType']) || 'none',
            preScript: ep.preScript || '',
            testScript: ep.testScript || '',
            response: null,
            isLoading: false,
            error: null,
            testResults: [],
            queryParams: parseQueryParams(ep.url || ''),
          },
        });
      }
    },

    createEndpoint: async (stashId, name) => {
      const now = timestampNow();
      const endpoint: StashEndpointRecord = {
        id: generateId(),
        stashId,
        name,
        method: 'GET',
        url: '',
        headers: null,
        body: null,
        bodyType: 'none',
        preScript: null,
        testScript: null,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await invoke('save_stash_endpoint', { record: endpoint });
      } catch (e) {
        console.error('Failed to save endpoint:', e);
      }
      set((s) => ({
        endpoints: [...s.endpoints, endpoint],
        selectedNodeId: `ep-${endpoint.id}`,
        activeRequest: defaultActiveRequest(),
      }));
      return endpoint.id;
    },

    renameEndpoint: async (id, name) => {
      const now = timestampNow();
      set((s) => ({
        endpoints: s.endpoints.map((ep) =>
          ep.id === id ? { ...ep, name, updatedAt: now } : ep
        ),
      }));
      const updated = get().endpoints.find((ep) => ep.id === id);
      if (updated) {
        try {
          await invoke('save_stash_endpoint', { record: updated });
        } catch (e) {
          console.error('Failed to rename endpoint:', e);
        }
      }
    },

    deleteEndpoint: async (id) => {
      set((s) => ({
        endpoints: s.endpoints.filter((ep) => ep.id !== id),
      }));
      try {
        await invoke('delete_stash_endpoint', { id });
      } catch (e) {
        console.error('Failed to delete endpoint:', e);
      }
    },

    moveEndpoint: async (id, newStashId, newSortOrder) => {
      const now = timestampNow();
      set((s) => ({
        endpoints: s.endpoints.map((ep) =>
          ep.id === id
            ? { ...ep, stashId: newStashId, sortOrder: newSortOrder ?? ep.sortOrder, updatedAt: now }
            : ep
        ),
      }));
      const updated = get().endpoints.find((e) => e.id === id);
      if (updated) {
        try {
          await invoke('save_stash_endpoint', { record: updated });
        } catch (e) {
          console.error('Failed to move endpoint:', e);
        }
      }
    },

    saveActiveEndpoint: async () => {
      const { activeRequest, selectedNodeId } = get();
      const epId = selectedNodeId?.startsWith('ep-') ? selectedNodeId.slice(3) : null;
      if (!epId) return;

      const headersJson =
        activeRequest.headers.length > 0
          ? JSON.stringify(
              Object.fromEntries(
                activeRequest.headers
                  .filter((h) => h.enabled && h.key)
                  .map((h) => [h.key, h.value])
              )
            )
          : null;

      // Rebuild URL with query params so they survive save/reload
      const urlWithParams = (() => {
        try {
          const base = activeRequest.url.split('?')[0];
          const active = activeRequest.queryParams.filter((p) => p.enabled && p.key);
          if (active.length === 0) return base;
          const q = active.map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
          return `${base}?${q}`;
        } catch { return activeRequest.url; }
      })();

      const now = timestampNow();
      set((s) => ({
        endpoints: s.endpoints.map((ep) =>
          ep.id === epId
            ? {
                ...ep,
                method: activeRequest.method,
                url: urlWithParams,
                headers: headersJson,
                body: activeRequest.body || null,
                bodyType: activeRequest.bodyType,
                preScript: activeRequest.preScript || null,
                testScript: activeRequest.testScript || null,
                updatedAt: now,
              }
            : ep
        ),
      }));

      const updated = get().endpoints.find((e) => e.id === epId);
      if (updated) {
        try {
          await invoke('save_stash_endpoint', { record: updated });
          toast.success('Request saved successfully');
        } catch (e) {
          console.error('Failed to save endpoint:', e);
          toast.error('Failed to save request');
        }
      }
    },

    updateActiveRequest: (updater) => {
      set((s) => {
        const patch = updater(s.activeRequest);
        const next = { ...s.activeRequest, ...patch };

        // ponytail: sync URL and query parameters to keep them aligned
        if ('url' in patch && patch.url !== undefined) {
          const newParams = parseQueryParams(patch.url);
          next.queryParams = newParams.map((np, idx) => {
            const existing = s.activeRequest.queryParams[idx];
            if (existing && existing.key === np.key && existing.value === np.value) {
              return { ...np, enabled: existing.enabled };
            }
            return np;
          });
        } else if ('queryParams' in patch && patch.queryParams !== undefined) {
          const baseUrl = s.activeRequest.url.split('?')[0];
          const active = patch.queryParams.filter((p) => p.enabled && p.key);
          if (active.length > 0) {
            const q = active.map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
            next.url = `${baseUrl}?${q}`;
          } else {
            next.url = baseUrl;
          }
        }

        return { activeRequest: next };
      });
    },

    // ── Context CRUD ──
    createContext: async (name, variables) => {
      const now = timestampNow();
      const record: ContextRecord = {
        id: generateId(),
        name,
        variables: JSON.stringify(variables),
        createdAt: now,
        updatedAt: now,
      };
      try {
        await invoke('save_context', { record });
      } catch (e) {
        console.error('Failed to save context:', e);
      }
      set((s) => ({ contexts: [...s.contexts, record] }));
    },

    updateContext: async (id, name, variables) => {
      const now = timestampNow();
      set((s) => ({
        contexts: s.contexts.map((c) =>
          c.id === id
            ? { ...c, name, variables: JSON.stringify(variables), updatedAt: now }
            : c
        ),
      }));
      const updated = get().contexts.find((c) => c.id === id);
      if (updated) {
        try {
          await invoke('save_context', { record: updated });
        } catch (e) {
          console.error('Failed to update context:', e);
        }
      }
    },

    deleteContext: async (id) => {
      set((s) => ({
        contexts: s.contexts.filter((c) => c.id !== id),
      }));
      try {
        await invoke('delete_context', { id });
      } catch (e) {
        console.error('Failed to delete context:', e);
      }
    },

    // ── Chronicle ──
    addChronicleRecord: async (method, url, requestHeaders, requestBody, response) => {
      const now = timestampNow();
      const record: ChronicleLogRecord = {
        id: generateId(),
        timestamp: now,
        method,
        url,
        requestHeaders,
        requestBody,
        responseStatus: response.status,
        responseStatusText: response.statusText,
        responseHeaders: JSON.stringify(response.headers),
        responseBody: response.body,
        durationMs: response.timeMs,
      };
      set((s) => ({
        chronicleLogs: [record, ...s.chronicleLogs].slice(0, 500),
      }));
      try {
        await invoke('add_chronicle_log', { record });
      } catch (e) {
        console.error('Failed to add chronicle log:', e);
      }
    },

    clearChronicle: async () => {
      set({ chronicleLogs: [] });
      try {
        await invoke('clear_chronicle_logs');
      } catch (e) {
        console.error('Failed to clear chronicle logs:', e);
      }
    },

    // ── Forge PaperPlaneTilt ──
    sendForgeRequest: async (payload) => {
      return invoke<ForgeResponse>('send_forge_request', { request: payload });
    },

    // ── Import / Export ──
    clearAllCollections: async (workspaceId) => {
      const state = get();
      const errors: string[] = [];

      // Funnel to workspace scope if provided
      const targetStashIds = workspaceId
        ? getWorkspaceStashIds(state.stashes, workspaceId)
        : new Set(state.stashes.map((s) => s.id));
      const targetEndpoints = state.endpoints.filter((ep) => targetStashIds.has(ep.stashId));

      // Delete endpoints first (FK-like dependency on stashes)
      for (const ep of targetEndpoints) {
        try {
          await invoke('delete_stash_endpoint', { id: ep.id });
        } catch (e) {
          console.error(`Failed to delete endpoint ${ep.id}:`, e);
          errors.push(String(e));
        }
      }

      // Delete stashes
      for (const stashId of targetStashIds) {
        try {
          await invoke('delete_stash', { id: stashId });
        } catch (e) {
          console.error(`Failed to delete stash ${stashId}:`, e);
          errors.push(String(e));
        }
      }

      set((s) => ({
        stashes: s.stashes.filter((st) => !targetStashIds.has(st.id)),
        endpoints: s.endpoints.filter((ep) => !targetStashIds.has(ep.stashId)),
      }));

      if (errors.length > 0) {
        console.warn('Errors during clear:', errors);
      }
    },

    batchImportCollections: async (stashes, endpoints, workspaceId) => {
      // Clear workspace-scoped data first if workspaceId provided
      const state = get();

      if (workspaceId) {
        const targetStashIds = getWorkspaceStashIds(state.stashes, workspaceId);
        const targetEndpoints = state.endpoints.filter((ep) => targetStashIds.has(ep.stashId));

        for (const ep of targetEndpoints) {
          try {
            await invoke('delete_stash_endpoint', { id: ep.id });
          } catch (e) {
            console.error(`Failed to delete endpoint during import:`, e);
          }
        }

        for (const stashId of targetStashIds) {
          try {
            await invoke('delete_stash', { id: stashId });
          } catch (e) {
            console.error(`Failed to delete stash during import:`, e);
          }
        }

        set((s) => ({
          stashes: s.stashes.filter((st) => !targetStashIds.has(st.id)),
          endpoints: s.endpoints.filter((ep) => !targetStashIds.has(ep.stashId)),
        }));
      } else {
        // Global clear (legacy behavior)
        for (const ep of state.endpoints) {
          try {
            await invoke('delete_stash_endpoint', { id: ep.id });
          } catch (e) {
            console.error(`Failed to delete endpoint during import:`, e);
          }
        }

        for (const st of state.stashes) {
          try {
            await invoke('delete_stash', { id: st.id });
          } catch (e) {
            console.error(`Failed to delete stash during import:`, e);
          }
        }

        set({ stashes: [], endpoints: [] });
      }

      const errors: string[] = [];
      let stashesImported = 0;
      let endpointsImported = 0;

      // Insert stashes (with workspaceId if provided)
      for (const st of stashes) {
        const record = workspaceId && !st.parentId ? { ...st, parentId: workspaceId } : st;
        try {
          await invoke('save_stash', { record });
          stashesImported++;
        } catch (e) {
          console.error(`Failed to import stash ${st.id}:`, e);
          errors.push(`Stash "${st.name}": ${String(e)}`);
        }
      }

      for (const ep of endpoints) {
        try {
          await invoke('save_stash_endpoint', { record: ep });
          endpointsImported++;
        } catch (e) {
          console.error(`Failed to import endpoint ${ep.id}:`, e);
          errors.push(`Endpoint "${ep.name}": ${String(e)}`);
        }
      }

      // Reload from DB to get consistent state
      try {
        const [freshStashes, freshEndpoints] = await Promise.all([
          invoke<StashRecord[]>('get_stashes'),
          invoke<StashEndpointRecord[]>('get_stash_endpoints'),
        ]);
        set({ stashes: freshStashes, endpoints: freshEndpoints });
      } catch (e) {
        console.error('Failed to reload after import:', e);
      }

      return { stashesImported, endpointsImported, errors };
    },
  }),
);
