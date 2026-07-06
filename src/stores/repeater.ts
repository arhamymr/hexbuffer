import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  createWorkspaceTab,
  type RepeaterRequest,
  type RepeaterWsRequest,
  type WorkspaceTab,
} from '@/pages/repeater/types';
import { DEFAULT_WORKSPACE_NAME } from '@/pages/repeater/constants';

export interface RepeaterState {
  // ── Workspaces ──
  workspaces: WorkspaceTab[];
  activeWorkspaceId: string;

  // Workspace CRUD
  createWorkspace: (name?: string, id?: string) => string;
  renameWorkspace: (id: string, name: string) => void;
  deleteWorkspace: (id: string) => void;
  setActiveWorkspaceId: (id: string) => void;
  closeTabsToLeft: (id: string) => void;
  closeTabsToRight: (id: string) => void;

  // ── Backward-compat shims (used by triggers/external consumers) ──
  /** @deprecated Use createWorkspace + populate forge panel instead. */
  addRequestTab: (request: RepeaterRequest) => string;
  /** @deprecated Use createWorkspace instead. */
  addEmptyHttpTab: () => string;
  /** @deprecated Use createWorkspace + populate forge panel instead. */
  addWsTab: (wsRequest: RepeaterWsRequest) => string;
  /** @deprecated Use createWorkspace or activate existing workspace instead. */
  addCollectionTab: (stashId: string, name: string) => string;
  /** @deprecated Use renameWorkspace instead. */
  renameTab: (id: string, name: string) => void;
  /** @deprecated No-op; forge panel manages its own request state. */
  updateTab: () => void;
}

function getNextWorkspaceCounter(workspaces: WorkspaceTab[]): number {
  let max = 0;
  for (const ws of workspaces) {
    const match = ws.name.match(/^Workspace (\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  }
  return max + 1;
}

export const useRepeaterStore = create<RepeaterState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: '',

      // ── Workspace CRUD ──

      createWorkspace: (name, id) => {
        const counter = getNextWorkspaceCounter(get().workspaces);
        const ws = createWorkspaceTab(name, counter, id);
        set((s) => ({
          workspaces: [...s.workspaces, ws],
          activeWorkspaceId: ws.id,
        }));
        return ws.id;
      },

      renameWorkspace: (id, name) =>
        set((s) => ({
          workspaces: s.workspaces.map((w) =>
            w.id === id ? { ...w, name } : w
          ),
        })),

      deleteWorkspace: (id) =>
        set((s) => {
          const remaining = s.workspaces.filter((w) => w.id !== id);
          if (remaining.length === 0) {
            // Don't delete the last workspace; keep app functional
            return s;
          }
          const closedIdx = s.workspaces.findIndex((w) => w.id === id);
          const nextActive =
            remaining[Math.min(closedIdx, remaining.length - 1)] ?? remaining[0];
          return {
            workspaces: remaining,
            activeWorkspaceId: nextActive.id,
          };
        }),

      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),

      closeTabsToLeft: (id) =>
        set((s) => {
          const idx = s.workspaces.findIndex((w) => w.id === id);
          if (idx <= 0) return s;
          const remaining = s.workspaces.slice(idx);
          const stillActive = remaining.some((w) => w.id === s.activeWorkspaceId)
            ? s.activeWorkspaceId
            : id;
          return { workspaces: remaining, activeWorkspaceId: stillActive };
        }),

      closeTabsToRight: (id) =>
        set((s) => {
          const idx = s.workspaces.findIndex((w) => w.id === id);
          if (idx < 0 || idx >= s.workspaces.length - 1) return s;
          const remaining = s.workspaces.slice(0, idx + 1);
          const stillActive = remaining.some((w) => w.id === s.activeWorkspaceId)
            ? s.activeWorkspaceId
            : id;
          return { workspaces: remaining, activeWorkspaceId: stillActive };
        }),

      // ── Backward-compat shims ──

      addRequestTab: (_request) => {
        const state = get();
        let wsId = state.activeWorkspaceId;
        if (!wsId || !state.workspaces.find((w) => w.id === wsId)) {
          wsId = state.createWorkspace(DEFAULT_WORKSPACE_NAME);
        }
        return wsId;
      },

      addEmptyHttpTab: () => {
        return get().createWorkspace(DEFAULT_WORKSPACE_NAME);
      },

      addWsTab: (_wsRequest) => {
        const state = get();
        let wsId = state.activeWorkspaceId;
        if (!wsId || !state.workspaces.find((w) => w.id === wsId)) {
          wsId = state.createWorkspace(DEFAULT_WORKSPACE_NAME);
        }
        return wsId;
      },

      addCollectionTab: (_stashId, _name) => {
        const state = get();
        let wsId = state.activeWorkspaceId;
        if (!wsId || !state.workspaces.find((w) => w.id === wsId)) {
          wsId = state.createWorkspace(DEFAULT_WORKSPACE_NAME);
        } else {
          set({ activeWorkspaceId: wsId });
        }
        return wsId;
      },

      renameTab: (id, name) => {
        // Redirect to workspace rename if the ID looks like a workspace
        const state = get();
        if (state.workspaces.find((w) => w.id === id)) {
          state.renameWorkspace(id, name);
        }
      },

      updateTab: () => {
        // No-op: forge panel manages its own request state now
      },
    }),
    {
      name: 'hexbuffer-repeater-v2',
      partialize: (state) => ({
        workspaces: state.workspaces,
        activeWorkspaceId: state.activeWorkspaceId,
      }),
      merge: (persistedState, currentState) => {
        const typedState = persistedState as Partial<RepeaterState> | undefined;

        // Detect old-format data (has 'tabs' array) and migrate
        const oldState = persistedState as Record<string, unknown> | undefined;
        if (oldState?.tabs && Array.isArray(oldState.tabs) && oldState.tabs.length > 0) {
          const oldTabs = oldState.tabs as Array<{ id: string; name: string; mode?: string; collectionId?: string; collectionName?: string }>;
          const migrated: WorkspaceTab[] = [];
          const seen = new Set<string>();
          for (const tab of oldTabs) {
            let wsId: string;
            let wsName: string;
            if (tab.mode === 'collection' && tab.collectionId) {
              wsId = tab.collectionId;
              wsName = tab.collectionName || tab.name;
            } else {
              wsId = tab.id;
              wsName = tab.name;
            }
            if (!seen.has(wsId)) {
              seen.add(wsId);
              migrated.push({ id: wsId, name: wsName });
            }
          }
          if (migrated.length > 0) {
            return {
              ...currentState,
              workspaces: migrated,
              activeWorkspaceId: migrated[0].id,
            };
          }
        }

        const persistedWorkspaces = typedState?.workspaces?.length
          ? typedState.workspaces
          : currentState.workspaces;
        const persistedActiveId = typedState?.activeWorkspaceId;
        const activeWorkspaceId =
          persistedActiveId && persistedWorkspaces.some((w) => w.id === persistedActiveId)
            ? persistedActiveId
            : persistedWorkspaces[0]?.id ?? '';

        return {
          ...currentState,
          ...typedState,
          workspaces: persistedWorkspaces,
          activeWorkspaceId,
        };
      },
    }
  )
);
