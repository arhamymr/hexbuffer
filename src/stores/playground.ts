import { create } from 'zustand';
import type {
  PlaygroundProject,
  FileTreeNode,
  OpenTab,
  SystemInfo,
  CommandOutput,
  PlaygroundLanguage,
} from '@/pages/playground/types';
import * as api from '@/pages/playground/api';

interface BuildHistoryEntry {
  timestamp: number;
  command: string;
  output: CommandOutput;
}

interface PlaygroundState {
  // Project
  project: PlaygroundProject | null;
  projectDir: string | null;

  // System info (compiler detection)
  systemInfo: SystemInfo | null;
  isLoadingSystemInfo: boolean;
  systemInfoError: string | null;

  // File tree
  fileTree: FileTreeNode[];
  isLoadingFileTree: boolean;

  // Open tabs
  openTabs: OpenTab[];
  activeTabPath: string | null;

  // Build
  buildOutput: CommandOutput | null;
  isBuilding: boolean;
  buildHistory: BuildHistoryEntry[];

  // Actions
  loadSystemInfo: () => Promise<void>;
  createProject: (name: string, language: PlaygroundLanguage) => Promise<void>;
  setProjectDir: (dir: string) => void;
  refreshFileTree: () => Promise<void>;
  openFile: (filePath: string) => Promise<void>;
  closeTab: (filePath: string) => void;
  setActiveTab: (filePath: string) => void;
  markTabDirty: (filePath: string, dirty: boolean) => void;
  markTabClean: (filePath: string) => void;
  setBuildOutput: (output: CommandOutput | null) => void;
  setIsBuilding: (v: boolean) => void;
  addBuildHistory: (entry: BuildHistoryEntry) => void;
  clearBuildHistory: () => void;
  resetProject: () => void;
}

const initialState = {
  project: null,
  projectDir: null,
  systemInfo: null,
  isLoadingSystemInfo: false,
  systemInfoError: null,
  fileTree: [],
  isLoadingFileTree: false,
  openTabs: [],
  activeTabPath: null,
  buildOutput: null,
  isBuilding: false,
  buildHistory: [],
};

export const usePlaygroundStore = create<PlaygroundState>()((set, get) => ({
  ...initialState,

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

  createProject: async (name, language) => {
    const dir = get().projectDir;
    const parent = dir ?? (await defaultProjectDir());
    const project = await api.createProject(name, language, parent);
    set({ project, projectDir: parent });
    // Refresh file tree immediately
    const files = await api.listProjectFiles(project.path);
    // Open main file
    const mainFile = language === 'rust' ? 'src/main.rs' : language === 'c' ? 'main.c' : 'main.cpp';
    const mainPath = mainFile;
    const lang = language === 'rust' ? 'rust' : language === 'c' ? 'c' : 'cpp';
    set({
      fileTree: files,
      openTabs: [{ path: mainPath, name: mainFile.split('/').pop()!, language: lang, isDirty: false }],
      activeTabPath: mainPath,
    });
  },

  setProjectDir: (dir) => set({ projectDir: dir }),

  refreshFileTree: async () => {
    const { project } = get();
    if (!project) return;
    set({ isLoadingFileTree: true });
    try {
      const files = await api.listProjectFiles(project.path);
      set({ fileTree: files, isLoadingFileTree: false });
    } catch {
      set({ isLoadingFileTree: false });
    }
  },

  openFile: async (filePath) => {
    const { project, openTabs } = get();
    if (!project) return;

    const existing = openTabs.find((t) => t.path === filePath);
    if (existing) {
      set({ activeTabPath: filePath });
      return;
    }

    const { getLanguageFromPath } = await import('@/pages/playground/types');
    const name = filePath.split('/').pop()!;
    const language = getLanguageFromPath(filePath);

    set({
      openTabs: [...openTabs, { path: filePath, name, language, isDirty: false }],
      activeTabPath: filePath,
    });
  },

  closeTab: (filePath) => {
    const { openTabs, activeTabPath } = get();
    const remaining = openTabs.filter((t) => t.path !== filePath);
    const newActive =
      activeTabPath === filePath
        ? remaining.length > 0
          ? remaining[remaining.length - 1].path
          : null
        : activeTabPath;
    set({ openTabs: remaining, activeTabPath: newActive });
  },

  setActiveTab: (filePath) => set({ activeTabPath: filePath }),

  markTabDirty: (filePath, dirty) => {
    set({
      openTabs: get().openTabs.map((t) =>
        t.path === filePath ? { ...t, isDirty: dirty } : t,
      ),
    });
  },

  markTabClean: (filePath) => {
    set({
      openTabs: get().openTabs.map((t) =>
        t.path === filePath ? { ...t, isDirty: false } : t,
      ),
    });
  },

  setBuildOutput: (output) => set({ buildOutput: output }),
  setIsBuilding: (v) => set({ isBuilding: v }),

  addBuildHistory: (entry) => {
    set({ buildHistory: [...get().buildHistory, entry] });
  },

  clearBuildHistory: () => set({ buildHistory: [], buildOutput: null }),

  resetProject: () => set({ ...initialState }),
}));

async function defaultProjectDir(): Promise<string> {
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<string>('get_home_directory');
  } catch {
    // Fallback for browser dev
    return '/tmp';
  }
}
