import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FileTreeNode,
  OpenTab,
  SystemInfo,
  CommandOutput,
  WorkspaceFolder,
} from '@/pages/code/types';
import * as api from '@/pages/code/api';

// ---------------------------------------------------------------------------
// Build history
// ---------------------------------------------------------------------------

export interface BuildHistoryEntry {
  timestamp: number;
  command: string;
  output: CommandOutput;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface PlaygroundState {
  // Workspace
  workspace: WorkspaceFolder | null; // null = no folder open (welcome screen)

  // Editor state (single set, not per-tab)
  fileTree: FileTreeNode[];
  isLoadingFileTree: boolean;
  openEditorTabs: OpenTab[];
  activeEditorPath: string | null;

  // Build state
  buildOutput: CommandOutput | null;
  isBuilding: boolean;
  buildHistory: BuildHistoryEntry[];

  // System info (for welcome screen toolchain display)
  systemInfo: SystemInfo | null;
  isLoadingSystemInfo: boolean;
  systemInfoError: string | null;

  // Recent folders (persisted)
  recentFolders: string[];

  // ── Actions ──

  // Workspace
  setWorkspace: (workspace: WorkspaceFolder | null) => void;
  addRecentFolder: (path: string) => void;
  removeRecentFolder: (path: string) => void;

  // File tree
  setFileTree: (tree: FileTreeNode[]) => void;
  setIsLoadingFileTree: (v: boolean) => void;

  // Editor tabs
  setOpenEditorTabs: (tabs: OpenTab[]) => void;
  setActiveEditorPath: (path: string | null) => void;

  // Build
  setBuildOutput: (output: CommandOutput | null) => void;
  setIsBuilding: (v: boolean) => void;
  addBuildHistory: (entry: BuildHistoryEntry) => void;
  clearBuildHistory: () => void;

  // System info
  loadSystemInfo: () => Promise<void>;
}

const MAX_RECENT_FOLDERS = 10;

export const usePlaygroundStore = create<PlaygroundState>()(
  persist(
    (set, get) => ({
      workspace: null,

      fileTree: [],
      isLoadingFileTree: false,
      openEditorTabs: [],
      activeEditorPath: null,

      buildOutput: null,
      isBuilding: false,
      buildHistory: [],

      systemInfo: null,
      isLoadingSystemInfo: false,
      systemInfoError: null,

      recentFolders: [],

      // ── Workspace ──

      setWorkspace: (workspace) => set({ workspace }),

      addRecentFolder: (path) => {
        const { recentFolders } = get();
        const filtered = recentFolders.filter((p) => p !== path);
        const updated = [path, ...filtered].slice(0, MAX_RECENT_FOLDERS);
        set({ recentFolders: updated });
      },

      removeRecentFolder: (path) => {
        const { recentFolders } = get();
        set({ recentFolders: recentFolders.filter((p) => p !== path) });
      },

      // ── File tree ──

      setFileTree: (tree) => set({ fileTree: tree }),
      setIsLoadingFileTree: (v) => set({ isLoadingFileTree: v }),

      // ── Editor tabs ──

      setOpenEditorTabs: (tabs) => set({ openEditorTabs: tabs }),
      setActiveEditorPath: (path) => set({ activeEditorPath: path }),

      // ── Build ──

      setBuildOutput: (output) => set({ buildOutput: output }),
      setIsBuilding: (v) => set({ isBuilding: v }),

      addBuildHistory: (entry) => {
        set((s) => ({
          buildHistory: [...s.buildHistory, entry],
        }));
      },

      clearBuildHistory: () => set({ buildHistory: [], buildOutput: null }),

      // ── System info ──

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
    }),
    {
      name: 'hexbuffer-playground',
      partialize: (state) => ({
        workspace: state.workspace,
        recentFolders: state.recentFolders,
      }),
    },
  ),
);
