import { useCallback, useEffect, useRef, useMemo } from 'react';
import { usePlaygroundStore } from '@/stores/playground';
import * as api from '../api';
import type { PlaygroundLanguage, PlaygroundProject, OpenTab, ProjectSummary } from '../types';
import { toast } from 'sonner';

export function usePlaygroundPage() {
  const store = usePlaygroundStore();

  // Per-tab file contents cache: tabId → (filePath → content)
  const fileContentsRef = useRef<Map<string, Map<string, string>>>(new Map());

  // Load shared state on mount
  useEffect(() => {
    store.loadSystemInfo();
    store.loadExistingProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Derived data ──

  const activeTab = useMemo(
    () => store.tabs.find((t) => t.id === store.activeTabId) ?? store.tabs[0] ?? null,
    [store.tabs, store.activeTabId],
  );

  const activeSession = useMemo(
    () => (store.activeTabId ? store.sessions[store.activeTabId] : undefined),
    [store.sessions, store.activeTabId],
  );

  const activeTabId = store.activeTabId;

  // Convert store tabs → PageTabItem for TabbedPageLayout
  const pageTabs = useMemo(
    () =>
      store.tabs.map((t) => ({
        id: t.id,
        name: t.project ? t.project.name : t.name,
      })),
    [store.tabs],
  );

  // Get file contents cache for the active tab
  const getActiveFileContents = useCallback(() => {
    if (!activeTabId) return new Map<string, string>();
    let m = fileContentsRef.current.get(activeTabId);
    if (!m) {
      m = new Map();
      fileContentsRef.current.set(activeTabId, m);
    }
    return m;
  }, [activeTabId]);

  const activeContent = useMemo(() => {
    const ap = activeSession?.activeEditorPath;
    if (!ap || !activeTabId) return '';
    return getActiveFileContents().get(ap) ?? '';
  }, [activeSession?.activeEditorPath, activeTabId, getActiveFileContents, activeSession?.openEditorTabs]);

  const activeLanguage = useMemo(() => {
    const tab = activeSession?.openEditorTabs.find(
      (t) => t.path === activeSession.activeEditorPath,
    );
    return tab?.language ?? '';
  }, [activeSession]);

  // ── Tab management ──

  const setActiveTab = useCallback(
    (tabId: string) => {
      store.setActiveTab(tabId);
    },
    [store],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      // Drop cached file contents for this tab
      fileContentsRef.current.delete(tabId);
      store.closeTab(tabId);
    },
    [store],
  );

  const renameTab = useCallback(
    (tabId: string, name: string) => {
      // Optional: we could rename, but for now tab names come from project name
    },
    [],
  );

  const closeTabsToLeft = useCallback(
    (tabId: string) => {
      const idx = store.tabs.findIndex((t) => t.id === tabId);
      if (idx <= 0) return;
      for (const t of store.tabs.slice(0, idx)) {
        fileContentsRef.current.delete(t.id);
      }
      // Simple approach: close each tab to the left
      const toClose = store.tabs.slice(0, idx).map((t) => t.id);
      for (const id of toClose) {
        store.closeTab(id);
      }
    },
    [store],
  );

  const closeTabsToRight = useCallback(
    (tabId: string) => {
      const idx = store.tabs.findIndex((t) => t.id === tabId);
      if (idx < 0) return;
      for (const t of store.tabs.slice(idx + 1)) {
        fileContentsRef.current.delete(t.id);
      }
      const toClose = store.tabs.slice(idx + 1).map((t) => t.id);
      for (const id of toClose) {
        store.closeTab(id);
      }
    },
    [store],
  );

  // ── File operations (active tab only) ──

  const handleOpenFile = useCallback(
    async (filePath: string) => {
      const project = activeTab?.project;
      if (!project || !activeTabId) return;

      const fc = getActiveFileContents();
      if (fc.has(filePath)) {
        // Already cached — just select it
        store.setSession(activeTabId, (s) => {
          const alreadyOpen = s.openEditorTabs.some((t) => t.path === filePath);
          if (alreadyOpen) {
            return { ...s, activeEditorPath: filePath };
          }
          const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
          const langMap: Record<string, string> = {
            rs: 'rust', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
            hpp: 'cpp', hh: 'cpp', hxx: 'cpp', js: 'javascript', jsx: 'javascript',
            html: 'html', htm: 'html', md: 'markdown', markdown: 'markdown',
          };
          const language = langMap[ext] ?? '';
          const newTab: OpenTab = {
            path: filePath,
            name: filePath.split('/').pop() ?? filePath,
            language,
            isDirty: false,
          };
          return {
            ...s,
            openEditorTabs: [...s.openEditorTabs, newTab],
            activeEditorPath: filePath,
          };
        });
        return;
      }

      try {
        const result = await api.readProjectFile(filePath, project.path);
        fc.set(filePath, result.content);
        store.setSession(activeTabId, (s) => {
          const alreadyOpen = s.openEditorTabs.some((t) => t.path === filePath);
          if (alreadyOpen) {
            return { ...s, activeEditorPath: filePath };
          }
          const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
          const langMap: Record<string, string> = {
            rs: 'rust', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
            hpp: 'cpp', hh: 'cpp', hxx: 'cpp', js: 'javascript', jsx: 'javascript',
            html: 'html', htm: 'html', md: 'markdown', markdown: 'markdown',
          };
          const language = langMap[ext] ?? '';
          const newTab: OpenTab = {
            path: filePath,
            name: filePath.split('/').pop() ?? filePath,
            language,
            isDirty: false,
          };
          return {
            ...s,
            openEditorTabs: [...s.openEditorTabs, newTab],
            activeEditorPath: filePath,
          };
        });
      } catch (err) {
        const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to open file';
        toast.error(msg);
      }
    },
    [activeTab, activeTabId, getActiveFileContents, store],
  );

  const handleTabClose = useCallback(
    (filePath: string) => {
      if (!activeTabId) return;
      const fc = getActiveFileContents();
      store.setSession(activeTabId, (s) => {
        const tab = s.openEditorTabs.find((t) => t.path === filePath);
        if (tab?.isDirty) {
          fc.delete(filePath);
        }
        const remaining = s.openEditorTabs.filter((t) => t.path !== filePath);
        const newActivePath =
          s.activeEditorPath === filePath
            ? remaining.length > 0
              ? remaining[remaining.length - 1].path
              : null
            : s.activeEditorPath;
        return { ...s, openEditorTabs: remaining, activeEditorPath: newActivePath };
      });
    },
    [activeTabId, getActiveFileContents, store],
  );

  const handleContentChange = useCallback(
    (filePath: string, content: string) => {
      if (!activeTabId) return;
      const fc = getActiveFileContents();
      fc.set(filePath, content);
      // Mark dirty
      store.setSession(activeTabId, (s) => ({
        ...s,
        openEditorTabs: s.openEditorTabs.map((t) =>
          t.path === filePath ? { ...t, isDirty: true } : t,
        ),
      }));
    },
    [activeTabId, getActiveFileContents, store],
  );

  const handleSaveFile = useCallback(
    async (filePath: string) => {
      const project = activeTab?.project;
      if (!project || !activeTabId) return;

      const fc = getActiveFileContents();
      const content = fc.get(filePath) ?? '';
      try {
        await api.writeProjectFile(filePath, content, project.path);
        store.setSession(activeTabId, (s) => ({
          ...s,
          openEditorTabs: s.openEditorTabs.map((t) =>
            t.path === filePath ? { ...t, isDirty: false } : t,
          ),
        }));
      } catch (err) {
        const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to save file';
        toast.error(msg);
      }
    },
    [activeTab, activeTabId, getActiveFileContents, store],
  );

  // ── Build & Run (active tab only) ──

  const handleBuild = useCallback(async () => {
    const project = activeTab?.project;
    if (!project || !activeTabId) return;
    if (activeSession?.isBuilding) return;

    store.setSessionIsBuilding(activeTabId, true);
    store.setSessionBuildOutput(activeTabId, null);

    const command =
      project.language === 'rust'
        ? 'cargo'
        : project.language === 'cpp'
          ? 'clang++'
          : 'gcc';
    const args =
      project.language === 'rust'
        ? ['build']
        : project.language === 'cpp'
          ? ['main.cpp', '-o', 'main']
          : ['main.c', '-o', 'main'];

    try {
      const output = await api.runBuildCommand(project.path, command, args);
      store.setSessionBuildOutput(activeTabId, output);
      store.addSessionBuildHistory(activeTabId, {
        timestamp: Date.now(),
        command: `${command} ${args.join(' ')}`,
        output,
      });
    } catch (err) {
      const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Build failed';
      store.setSessionBuildOutput(activeTabId, {
        stdout: '',
        stderr: msg,
        exitCode: -1,
        success: false,
      });
    } finally {
      store.setSessionIsBuilding(activeTabId, false);
    }
  }, [activeTab, activeTabId, activeSession?.isBuilding, store]);

  const handleRun = useCallback(async () => {
    const project = activeTab?.project;
    if (!project || !activeTabId) return;
    if (activeSession?.isBuilding) return;

    store.setSessionIsBuilding(activeTabId, true);
    store.setSessionBuildOutput(activeTabId, null);

    const command = project.language === 'rust' ? 'cargo' : './main';
    const args = project.language === 'rust' ? ['run'] : [];

    try {
      const output = await api.runBuildCommand(project.path, command, args);
      store.setSessionBuildOutput(activeTabId, output);
      store.addSessionBuildHistory(activeTabId, {
        timestamp: Date.now(),
        command: `${command} ${args.join(' ')}`,
        output,
      });
    } catch (err) {
      const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Run failed';
      store.setSessionBuildOutput(activeTabId, {
        stdout: '',
        stderr: msg,
        exitCode: -1,
        success: false,
      });
    } finally {
      store.setSessionIsBuilding(activeTabId, false);
    }
  }, [activeTab, activeTabId, activeSession?.isBuilding, store]);

  // ── Project actions ──

  const handleCreateProject = useCallback(
    async (name: string, language: PlaygroundLanguage) => {
      try {
        // Always fetch system info fresh to guarantee homeDir is available —
        // reading from the store races against the initial load.
        const info = await api.getSystemInfo();
        const parentDir = info.homeDir;
        if (!parentDir) {
          toast.error('Could not determine home directory');
          return;
        }
        const project = await api.createProject(name, language, parentDir);
        const tabId = store.addProjectTab(project);

        // Load file tree for new project
        const tree = await api.listProjectFiles(project.path);
        store.setSessionFileTree(tabId, tree);

        // Find and auto-open main file
        const mainFile = tree.flatMap((n) =>
          n.isDir ? [] : [{ path: n.path, name: n.name }],
        );
        const wanted =
          language === 'rust'
            ? mainFile.find((f) => f.name === 'main.rs')
            : mainFile.find((f) => f.name === 'main.cpp' || f.name === 'main.c');

        if (wanted) {
          // Load content into cache
          let m = fileContentsRef.current.get(tabId);
          if (!m) {
            m = new Map();
            fileContentsRef.current.set(tabId, m);
          }
          const result = await api.readProjectFile(wanted.path, project.path);
          m.set(wanted.path, result.content);

          const ext = wanted.name.split('.').pop()?.toLowerCase() ?? '';
          const langMap: Record<string, string> = { rs: 'rust', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp' };
          const lang = langMap[ext] ?? '';
          const openTab: OpenTab = {
            path: wanted.path,
            name: wanted.name,
            language: lang,
            isDirty: false,
          };
          store.setSessionOpenEditorTabs(tabId, [openTab]);
          store.setSessionActiveEditorPath(tabId, wanted.path);
        }
      } catch (err) {
        const msg =
          typeof err === 'string'
            ? err
            : err instanceof Error
              ? err.message
              : 'Failed to create project';
        toast.error(msg);
      }
    },
    [store],
  );

  const handleOpenExistingProject = useCallback(
    async (summary: ProjectSummary) => {
      try {
        const project: PlaygroundProject = {
          name: summary.name,
          path: summary.path,
          language: (['rust', 'c', 'cpp'].includes(summary.language)
            ? summary.language
            : 'c') as PlaygroundLanguage,
        };
        const tabId = store.addProjectTab(project);

        // Load file tree
        const tree = await api.listProjectFiles(project.path);
        store.setSessionFileTree(tabId, tree);

        // Auto-open main file
        const flatFiles = tree.flatMap((n) =>
          n.isDir ? [] : [{ path: n.path, name: n.name }],
        );
        const wanted =
          project.language === 'rust'
            ? flatFiles.find((f) => f.name === 'main.rs')
            : flatFiles.find((f) => f.name === 'main.cpp' || f.name === 'main.c');

        if (wanted) {
          let m = fileContentsRef.current.get(tabId);
          if (!m) {
            m = new Map();
            fileContentsRef.current.set(tabId, m);
          }
          const result = await api.readProjectFile(wanted.path, project.path);
          m.set(wanted.path, result.content);

          const ext = wanted.name.split('.').pop()?.toLowerCase() ?? '';
          const langMap: Record<string, string> = { rs: 'rust', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp' };
          const lang = langMap[ext] ?? '';
          const openTab: OpenTab = { path: wanted.path, name: wanted.name, language: lang, isDirty: false };
          store.setSessionOpenEditorTabs(tabId, [openTab]);
          store.setSessionActiveEditorPath(tabId, wanted.path);
        }
      } catch (err) {
        const msg =
          typeof err === 'string'
            ? err
            : err instanceof Error
              ? err.message
              : 'Failed to open project';
        toast.error(msg);
      }
    },
    [store],
  );

  const handleCloseProject = useCallback(() => {
    if (!activeTabId) return;
    fileContentsRef.current.delete(activeTabId);
    store.closeTab(activeTabId);
    // Reload project list for landing tab
    store.loadExistingProjects();
  }, [activeTabId, store]);

  const handleRefreshTree = useCallback(async () => {
    const project = activeTab?.project;
    if (!project || !activeTabId) return;
    try {
      const tree = await api.listProjectFiles(project.path);
      store.setSessionFileTree(activeTabId, tree);
    } catch (err) {
      toast.error(
        typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to refresh file tree',
      );
    }
  }, [activeTab, activeTabId, store]);

  const handleNewFile = useCallback(
    async (parentPath: string, fileName: string) => {
      const project = activeTab?.project;
      if (!project || !activeTabId) return;
      const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
      try {
        await api.writeProjectFile(filePath, '', project.path);
        await handleRefreshTree();
      } catch (err) {
        toast.error(
          typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to create file',
        );
      }
    },
    [activeTab, activeTabId, store, handleRefreshTree],
  );

  const handleDeleteFile = useCallback(
    async (filePath: string) => {
      const project = activeTab?.project;
      if (!project || !activeTabId) return;
      try {
        await api.deleteProjectFile(filePath, project.path);
        // Close editor tab if file was open
        const session = store.sessions[activeTabId];
        if (session) {
          const edTab = session.openEditorTabs.find((t) => t.path === filePath);
          if (edTab) {
            const fc = getActiveFileContents();
            fc.delete(filePath);
            const remaining = session.openEditorTabs.filter((t) => t.path !== filePath);
            const newActivePath =
              session.activeEditorPath === filePath
                ? remaining.length > 0
                  ? remaining[remaining.length - 1].path
                  : null
                : session.activeEditorPath;
            store.setSession(activeTabId, () => ({
              ...session,
              openEditorTabs: remaining,
              activeEditorPath: newActivePath,
            }));
          }
        }
        await handleRefreshTree();
      } catch (err) {
        toast.error(
          typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to delete file',
        );
      }
    },
    [activeTab, activeTabId, getActiveFileContents, store, handleRefreshTree],
  );

  const handleRenameFile = useCallback(
    async (oldPath: string, newName: string) => {
      const project = activeTab?.project;
      if (!project || !activeTabId) return;
      const parts = oldPath.split('/');
      parts[parts.length - 1] = newName;
      const newPath = parts.join('/');
      try {
        await api.renameProjectFile(oldPath, newPath, project.path);
        // Update editor tabs
        const session = store.sessions[activeTabId];
        if (session) {
          const edTab = session.openEditorTabs.find((t) => t.path === oldPath);
          const fc = getActiveFileContents();
          if (edTab) {
            const content = fc.get(oldPath);
            fc.delete(oldPath);
            if (content !== undefined) {
              fc.set(newPath, content);
            }
            const ext = newName.split('.').pop()?.toLowerCase() ?? '';
            const langMap: Record<string, string> = { rs: 'rust', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp' };
            const lang = langMap[ext] ?? '';
            const renamedTab: OpenTab = { path: newPath, name: newName, language: lang, isDirty: edTab.isDirty };
            store.setSession(activeTabId, (s) => ({
              ...s,
              openEditorTabs: s.openEditorTabs.map((t) =>
                t.path === oldPath ? renamedTab : t,
              ),
              activeEditorPath: s.activeEditorPath === oldPath ? newPath : s.activeEditorPath,
            }));
          }
        }
        await handleRefreshTree();
      } catch (err) {
        toast.error(
          typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to rename file',
        );
      }
    },
    [activeTab, activeTabId, getActiveFileContents, store, handleRefreshTree],
  );

  // ── Build history cleanup ──

  const clearBuildHistory = useCallback(() => {
    if (!activeTabId) return;
    store.clearSessionBuildHistory(activeTabId);
  }, [activeTabId, store]);

  const setActiveEditorTab = useCallback(
    (path: string) => {
      if (!activeTabId) return;
      store.setSessionActiveEditorPath(activeTabId, path);
    },
    [activeTabId, store],
  );

  // Build history
  const buildHistory = activeSession?.buildHistory ?? [];

  return {
    // Tab state
    tabs: pageTabs,
    activeTabId,
    activeTab,
    setActiveTab,
    closeTab,
    renameTab,
    closeTabsToLeft,
    closeTabsToRight,

    // Shared
    systemInfo: store.systemInfo,
    isLoadingSystemInfo: store.isLoadingSystemInfo,
    systemInfoError: store.systemInfoError,
    existingProjects: store.existingProjects,
    isLoadingProjects: store.isLoadingProjects,

    // Active session
    project: activeTab?.project ?? null,
    fileTree: activeSession?.fileTree ?? [],
    openTabs: activeSession?.openEditorTabs ?? [],
    activeTabPath: activeSession?.activeEditorPath ?? null,
    activeContent,
    activeLanguage,
    buildOutput: activeSession?.buildOutput ?? null,
    isBuilding: activeSession?.isBuilding ?? false,
    buildHistory,

    // Actions
    handleCreateProject,
    handleOpenExistingProject,
    handleOpenFile,
    handleTabClose,
    handleContentChange,
    handleSaveFile,
    handleBuild,
    handleRun,
    handleCloseProject,
    handleRefreshTree,
    handleNewFile,
    handleDeleteFile,
    handleRenameFile,
    setActiveEditorTab,
    clearBuildHistory,
  };
}
