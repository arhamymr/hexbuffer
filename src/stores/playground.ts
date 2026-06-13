import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  PlaygroundProject,
  PlaygroundTab,
  FileTreeNode,
  OpenTab,
  SystemInfo,
  CommandOutput,
  PlaygroundLanguage,
  ProjectSummary,
} from '@/pages/code/types';
import * as api from '@/pages/code/api';

// ---------------------------------------------------------------------------
// Per-tab session (runtime state for each open project tab)
// ---------------------------------------------------------------------------

export interface BuildHistoryEntry {
  timestamp: number;
  command: string;
  output: CommandOutput;
}

export interface TabSession {
  fileTree: FileTreeNode[];
  isLoadingFileTree: boolean;
  openEditorTabs: OpenTab[];
  activeEditorPath: string | null;
  buildOutput: CommandOutput | null;
  isBuilding: boolean;
  buildHistory: BuildHistoryEntry[];
}

function createEmptySession(): TabSession {
  return {
    fileTree: [],
    isLoadingFileTree: false,
    openEditorTabs: [],
    activeEditorPath: null,
    buildOutput: null,
    isBuilding: false,
    buildHistory: [],
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface PlaygroundState {
  // Tabs
  tabs: PlaygroundTab[];
  activeTabId: string | null;

  // Per-tab runtime sessions (not persisted)
  sessions: Record<string, TabSession>;

  // Shared / global state
  systemInfo: SystemInfo | null;
  isLoadingSystemInfo: boolean;
  systemInfoError: string | null;

  // Existing projects list (shown on landing tab)
  existingProjects: ProjectSummary[];
  isLoadingProjects: boolean;

  // Actions — tabs
  addProjectTab: (project: PlaygroundProject) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;

  // Actions — sessions
  setSession: (tabId: string, updater: (s: TabSession) => TabSession) => void;
  setSessionFileTree: (tabId: string, tree: FileTreeNode[]) => void;
  setSessionOpenEditorTabs: (tabId: string, tabs: OpenTab[]) => void;
  setSessionActiveEditorPath: (tabId: string, path: string | null) => void;
  setSessionBuildOutput: (tabId: string, output: CommandOutput | null) => void;
  setSessionIsBuilding: (tabId: string, v: boolean) => void;
  addSessionBuildHistory: (tabId: string, entry: BuildHistoryEntry) => void;
  clearSessionBuildHistory: (tabId: string) => void;

  // Actions — global
  loadSystemInfo: () => Promise<void>;
  loadExistingProjects: () => Promise<void>;
}

const LANDING_TAB_ID = '__playground_landing__';

function createLandingTab(): PlaygroundTab {
  return { id: LANDING_TAB_ID, name: 'Get Started', project: null };
}

export const usePlaygroundStore = create<PlaygroundState>()(
  persist(
    (set, get) => ({
      tabs: [createLandingTab()],
      activeTabId: LANDING_TAB_ID,
      sessions: { [LANDING_TAB_ID]: createEmptySession() },

      systemInfo: null,
      isLoadingSystemInfo: false,
      systemInfoError: null,

      existingProjects: [],
      isLoadingProjects: false,

      // ── Tab management ──

      addProjectTab: (project) => {
        const id = nanoid(8);
        const tab: PlaygroundTab = { id, name: project.name, project };
        const session = createEmptySession();
        set((s) => ({
          tabs: [...s.tabs, tab],
          activeTabId: id,
          sessions: { ...s.sessions, [id]: session },
        }));
        return id;
      },

      closeTab: (tabId) => {
        const { tabs, activeTabId } = get();
        if (tabId === LANDING_TAB_ID) return; // can't close landing

        const remaining = tabs.filter((t) => t.id !== tabId);
        let newActive = activeTabId;
        if (activeTabId === tabId || !remaining.some((t) => t.id === activeTabId)) {
          newActive = remaining.length > 0 ? remaining[remaining.length - 1].id : LANDING_TAB_ID;
        }

        const { [tabId]: _, ...restSessions } = get().sessions;
        set({ tabs: remaining, activeTabId: newActive, sessions: restSessions });
      },

      setActiveTab: (tabId) => set({ activeTabId: tabId }),

      // ── Session mutations ──

      setSession: (tabId, updater) => {
        set((s) => ({
          sessions: {
            ...s.sessions,
            [tabId]: updater(s.sessions[tabId] ?? createEmptySession()),
          },
        }));
      },

      setSessionFileTree: (tabId, tree) => {
        set((s) => ({
          sessions: {
            ...s.sessions,
            [tabId]: { ...(s.sessions[tabId] ?? createEmptySession()), fileTree: tree },
          },
        }));
      },

      setSessionOpenEditorTabs: (tabId, openEditorTabs) => {
        set((s) => ({
          sessions: {
            ...s.sessions,
            [tabId]: { ...(s.sessions[tabId] ?? createEmptySession()), openEditorTabs },
          },
        }));
      },

      setSessionActiveEditorPath: (tabId, path) => {
        set((s) => ({
          sessions: {
            ...s.sessions,
            [tabId]: { ...(s.sessions[tabId] ?? createEmptySession()), activeEditorPath: path },
          },
        }));
      },

      setSessionBuildOutput: (tabId, output) => {
        set((s) => ({
          sessions: {
            ...s.sessions,
            [tabId]: { ...(s.sessions[tabId] ?? createEmptySession()), buildOutput: output },
          },
        }));
      },

      setSessionIsBuilding: (tabId, v) => {
        set((s) => ({
          sessions: {
            ...s.sessions,
            [tabId]: { ...(s.sessions[tabId] ?? createEmptySession()), isBuilding: v },
          },
        }));
      },

      addSessionBuildHistory: (tabId, entry) => {
        set((s) => {
          const session = s.sessions[tabId] ?? createEmptySession();
          return {
            sessions: {
              ...s.sessions,
              [tabId]: {
                ...session,
                buildHistory: [...session.buildHistory, entry],
              },
            },
          };
        });
      },

      clearSessionBuildHistory: (tabId) => {
        set((s) => ({
          sessions: {
            ...s.sessions,
            [tabId]: {
              ...(s.sessions[tabId] ?? createEmptySession()),
              buildHistory: [],
              buildOutput: null,
            },
          },
        }));
      },

      // ── Global actions ──

      loadSystemInfo: async () => {
        set({ isLoadingSystemInfo: true, systemInfoError: null });
        try {
          const info = await api.getSystemInfo();
          set({ systemInfo: info, isLoadingSystemInfo: false });
        } catch (err) {
          set({
            isLoadingSystemInfo: false,
            systemInfoError: err instanceof Error ? err.message : String(err),
          });
        }
      },

      loadExistingProjects: async () => {
        set({ isLoadingProjects: true });
        try {
          const info = await api.getSystemInfo();
          const projects = await api.listProjects(info.homeDir);
          set({ existingProjects: projects, isLoadingProjects: false });
        } catch {
          set({ isLoadingProjects: false });
        }
      },
    }),
    {
      name: '0xbuffer-playground',
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PlaygroundState>;
        // Always ensure landing tab exists
        const tabs = p.tabs?.length ? p.tabs : [createLandingTab()];
        const hasLanding = tabs.some((t) => t.id === LANDING_TAB_ID);
        if (!hasLanding) tabs.unshift(createLandingTab());

        const activeTabId = tabs.some((t) => t.id === p.activeTabId)
          ? p.activeTabId!
          : tabs[0].id;

        // Rebuild sessions for each tab
        const sessions: Record<string, TabSession> = {};
        for (const tab of tabs) {
          sessions[tab.id] = createEmptySession();
        }

        return {
          ...(current as PlaygroundState),
          tabs,
          activeTabId,
          sessions,
        };
      },
    },
  ),
);
