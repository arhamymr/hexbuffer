import { useCallback, useEffect, useRef, useMemo, useState } from 'react';

import { convertFileSrc } from '@tauri-apps/api/core';
import { usePlaygroundStore } from '@/stores/playground';
import { useShallow } from 'zustand/react/shallow';
import * as api from '../api';
import {
  buildPlayground,
  runPlayground,
  refreshPlaygroundTree,
  closePlaygroundFolder,
} from '@/triggers';
import {
  getLanguageFromPath,
  isImageFile,
  detectWorkspaceLanguage,
  type OpenTab,
  type PlaygroundLanguage,
  type WorkspaceFolder,
} from '../types';
import { toast } from 'sonner';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { useGlobalTerminalStore } from '@/stores/global-terminal';

export function usePlaygroundPage() {
  const {
    workspace,
    systemInfo,
    isLoadingSystemInfo,
    systemInfoError,
    recentFolders,
    fileTree,
    openEditorTabs,
    activeEditorPath,
    buildOutput,
    isBuilding,
    buildHistory,
    loadSystemInfo,
    setIsLoadingFileTree,
    setFileTree,
    setWorkspace,
    setOpenEditorTabs,
    setActiveEditorPath,
    setBuildOutput,
    clearBuildHistory,
    addRecentFolder,
    removeRecentFolder,
    setIsBuilding,
    addBuildHistory,
  } = usePlaygroundStore(
    useShallow((s) => ({
      workspace: s.workspace,
      systemInfo: s.systemInfo,
      isLoadingSystemInfo: s.isLoadingSystemInfo,
      systemInfoError: s.systemInfoError,
      recentFolders: s.recentFolders,
      fileTree: s.fileTree,
      openEditorTabs: s.openEditorTabs,
      activeEditorPath: s.activeEditorPath,
      buildOutput: s.buildOutput,
      isBuilding: s.isBuilding,
      buildHistory: s.buildHistory,
      loadSystemInfo: s.loadSystemInfo,
      setIsLoadingFileTree: s.setIsLoadingFileTree,
      setFileTree: s.setFileTree,
      setWorkspace: s.setWorkspace,
      setOpenEditorTabs: s.setOpenEditorTabs,
      setActiveEditorPath: s.setActiveEditorPath,
      setBuildOutput: s.setBuildOutput,
      clearBuildHistory: s.clearBuildHistory,
      addRecentFolder: s.addRecentFolder,
      removeRecentFolder: s.removeRecentFolder,
      setIsBuilding: s.setIsBuilding,
      addBuildHistory: s.addBuildHistory,
    }))
  );

  const [activeSidebarTab, setActiveSidebarTab] = useState<'explorer' | 'git'>('explorer');

  // File contents cache: filePath → content
  const fileContentsRef = useRef<Map<string, string>>(new Map());

  // Load system info on mount
  useEffect(() => {
    loadSystemInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If workspace is persisted (from store hydration), reload file tree on mount
  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;
    if (workspace?.path) {
      void loadWorkspaceTree(workspace.path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear file contents cache when workspace is closed
  useEffect(() => {
    if (!workspace) {
      fileContentsRef.current.clear();
    }
  }, [workspace]);

  // Auto-load uncached file when activeEditorPath changes (e.g. navigation from other pages)
  useEffect(() => {
    if (activeEditorPath && workspace && !fileContentsRef.current.has(activeEditorPath)) {
      const loadUncachedFile = async () => {
        try {
          if (isImageFile(activeEditorPath)) {
            const absolutePath = `${workspace.path}/${activeEditorPath}`;
            const assetUrl = convertFileSrc(absolutePath);
            fileContentsRef.current.set(activeEditorPath, assetUrl);
          } else {
            const result = await api.readProjectFile(activeEditorPath, workspace.path);
            fileContentsRef.current.set(activeEditorPath, result.content);
          }
          // Force a shallow re-render by updating the tabs references
          setOpenEditorTabs([...openEditorTabs]);
        } catch (err) {
          console.error('Failed to auto-load file:', err);
        }
      };
      void loadUncachedFile();
    }
  }, [activeEditorPath, workspace, openEditorTabs, setOpenEditorTabs]);

  // ── Helpers ──

  const loadWorkspaceTree = useCallback(
    async (folderPath: string) => {
      setIsLoadingFileTree(true);
      try {
        const tree = await api.listProjectFiles(folderPath);
        setFileTree(tree);
        // Detect language from tree
        const lang = detectWorkspaceLanguage(tree);
        if (workspace && workspace.path === folderPath && workspace.language !== lang) {
          setWorkspace({ ...workspace, language: lang });
        }
      } catch (err) {
        toast.error(
          typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to load folder',
        );
      } finally {
        setIsLoadingFileTree(false);
      }
    },
    [setIsLoadingFileTree, setFileTree, setWorkspace, workspace],
  );

  // ── Derived data ──

  const activeContent = useMemo(() => {
    if (!activeEditorPath) return '';
    return fileContentsRef.current.get(activeEditorPath) ?? '';
  }, [activeEditorPath, openEditorTabs]);

  const activeLanguage = useMemo(() => {
    const tab = openEditorTabs.find((t) => t.path === activeEditorPath);
    return tab?.language ?? '';
  }, [openEditorTabs, activeEditorPath]);

  // ── Folder operations ──

  const handleOpenFolder = useCallback(async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: 'Open Folder',
      });
      if (!selected) return;
      const folderPath = typeof selected === 'string' ? selected : selected[0];
      if (!folderPath) return;

      const name = folderPath.split('/').pop() ?? folderPath;
      const workspace: WorkspaceFolder = { name, path: folderPath, language: 'unknown' };

      setWorkspace(workspace);
      setOpenEditorTabs([]);
      setActiveEditorPath(null);
      setBuildOutput(null);
      clearBuildHistory();
      fileContentsRef.current.clear();
      addRecentFolder(folderPath);

      // Load tree and detect language
      setIsLoadingFileTree(true);
      const tree = await api.listProjectFiles(folderPath);
      setFileTree(tree);
      const lang = detectWorkspaceLanguage(tree);
      setWorkspace({ ...workspace, language: lang });
      setIsLoadingFileTree(false);
    } catch (err) {
      const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to open folder';
      toast.error(msg);
    }
  }, [setWorkspace, setOpenEditorTabs, setActiveEditorPath, setBuildOutput, clearBuildHistory, addRecentFolder, setIsLoadingFileTree, setFileTree]);

  const handleOpenRecentFolder = useCallback(
    async (folderPath: string) => {
      try {
        const name = folderPath.split('/').pop() ?? folderPath;
        const workspace: WorkspaceFolder = { name, path: folderPath, language: 'unknown' };

        setWorkspace(workspace);
        setOpenEditorTabs([]);
        setActiveEditorPath(null);
        setBuildOutput(null);
        clearBuildHistory();
        fileContentsRef.current.clear();
        addRecentFolder(folderPath);

        setIsLoadingFileTree(true);
        const tree = await api.listProjectFiles(folderPath);
        setFileTree(tree);
        const lang = detectWorkspaceLanguage(tree);
        setWorkspace({ ...workspace, language: lang });
        setIsLoadingFileTree(false);
      } catch (err) {
        const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to open folder';
        toast.error(msg);
        // Remove stale path from recents
        removeRecentFolder(folderPath);
      }
    },
    [setWorkspace, setOpenEditorTabs, setActiveEditorPath, setBuildOutput, clearBuildHistory, addRecentFolder, setIsLoadingFileTree, setFileTree, removeRecentFolder],
  );

  const handleCloseFolder = useCallback(() => {
    closePlaygroundFolder();
  }, []);

  // ── Create Project (secondary flow) ──

  const handleCreateProject = useCallback(
    async (name: string, language: PlaygroundLanguage) => {
      try {
        const info = await api.getSystemInfo();
        const parentDir = info.homeDir;
        if (!parentDir) {
          toast.error('Could not determine home directory');
          return;
        }
        const project = await api.createProject(name, language, parentDir);

        // Open the created project folder
        const workspace: WorkspaceFolder = {
          name: project.name,
          path: project.path,
          language: project.language,
        };
        setWorkspace(workspace);
        setOpenEditorTabs([]);
        setActiveEditorPath(null);
        setBuildOutput(null);
        clearBuildHistory();
        fileContentsRef.current.clear();
        addRecentFolder(project.path);

        // Load tree
        setIsLoadingFileTree(true);
        const tree = await api.listProjectFiles(project.path);
        setFileTree(tree);
        setIsLoadingFileTree(false);

        // Auto-open main file
        const flatFiles = tree.flatMap((n) =>
          n.isDir ? [] : [{ path: n.path, name: n.name }],
        );
        const wanted =
          language === 'rust'
            ? flatFiles.find((f) => f.name === 'main.rs')
            : flatFiles.find((f) => f.name === 'main.cpp' || f.name === 'main.c');

        if (wanted) {
          const result = await api.readProjectFile(wanted.path, project.path);
          fileContentsRef.current.set(wanted.path, result.content);

          const openTab: OpenTab = {
            path: wanted.path,
            name: wanted.name,
            language: getLanguageFromPath(wanted.path),
            isDirty: false,
          };
          setOpenEditorTabs([openTab]);
          setActiveEditorPath(wanted.path);
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
    [setWorkspace, setOpenEditorTabs, setActiveEditorPath, setBuildOutput, clearBuildHistory, addRecentFolder, setIsLoadingFileTree, setFileTree],
  );

  // ── File operations ──

  const handleOpenFile = useCallback(
    async (filePath: string) => {
      if (!workspace) return;

      const cache = fileContentsRef.current;
      if (cache.has(filePath)) {
        const alreadyOpen = openEditorTabs.some((t) => t.path === filePath);
        if (alreadyOpen) {
          setActiveEditorPath(filePath);
          return;
        }
        const newTab: OpenTab = {
          path: filePath,
          name: filePath.split('/').pop() ?? filePath,
          language: getLanguageFromPath(filePath),
          isDirty: false,
        };
        setOpenEditorTabs([...openEditorTabs, newTab]);
        setActiveEditorPath(filePath);
        return;
      }

      // Image files: use Tauri asset protocol instead of reading as text
      if (isImageFile(filePath)) {
        const absolutePath = `${workspace.path}/${filePath}`;
        const assetUrl = convertFileSrc(absolutePath);
        cache.set(filePath, assetUrl);

        const alreadyOpen = openEditorTabs.some((t) => t.path === filePath);
        if (alreadyOpen) {
          setActiveEditorPath(filePath);
          return;
        }
        const newTab: OpenTab = {
          path: filePath,
          name: filePath.split('/').pop() ?? filePath,
          language: 'image',
          isDirty: false,
        };
        setOpenEditorTabs([...openEditorTabs, newTab]);
        setActiveEditorPath(filePath);
        return;
      }

      try {
        const result = await api.readProjectFile(filePath, workspace.path);
        cache.set(filePath, result.content);

        const alreadyOpen = openEditorTabs.some((t) => t.path === filePath);
        if (alreadyOpen) {
          setActiveEditorPath(filePath);
          return;
        }
        const newTab: OpenTab = {
          path: filePath,
          name: filePath.split('/').pop() ?? filePath,
          language: getLanguageFromPath(filePath),
          isDirty: false,
        };
        setOpenEditorTabs([...openEditorTabs, newTab]);
        setActiveEditorPath(filePath);
      } catch (err) {
        const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to open file';
        toast.error(msg);
      }
    },
    [workspace, openEditorTabs, setActiveEditorPath, setOpenEditorTabs],
  );

  const handleOpenDiff = useCallback(
    (filePath: string, staged: boolean) => {
      if (!workspace) return;
      const diffPath = `gitdiff:${filePath}:${staged ? 'staged' : 'unstaged'}`;
      const diffName = `Diff: ${filePath.split('/').pop()}`;

      const alreadyOpen = openEditorTabs.some((t) => t.path === diffPath);
      if (alreadyOpen) {
        setActiveEditorPath(diffPath);
        return;
      }

      const newTab: OpenTab = {
        path: diffPath,
        name: diffName,
        language: getLanguageFromPath(filePath),
        isDirty: false,
      };

      setOpenEditorTabs([...openEditorTabs, newTab]);
      setActiveEditorPath(diffPath);
    },
    [workspace, openEditorTabs, setActiveEditorPath, setOpenEditorTabs],
  );


  const handleTabClose = useCallback(
    (filePath: string) => {
      const cache = fileContentsRef.current;
      cache.delete(filePath);
      const remaining = openEditorTabs.filter((t) => t.path !== filePath);
      const newActivePath =
        activeEditorPath === filePath
          ? remaining.length > 0
            ? remaining[remaining.length - 1].path
            : null
          : activeEditorPath;
      setOpenEditorTabs(remaining);
      setActiveEditorPath(newActivePath);
    },
    [openEditorTabs, activeEditorPath, setOpenEditorTabs, setActiveEditorPath],
  );

  const handleContentChange = useCallback(
    (filePath: string, content: string) => {
      fileContentsRef.current.set(filePath, content);
      setOpenEditorTabs(
        openEditorTabs.map((t) =>
          t.path === filePath ? { ...t, isDirty: true } : t,
        ),
      );
    },
    [openEditorTabs, setOpenEditorTabs],
  );

  const handleSaveFile = useCallback(
    async (filePath: string) => {
      if (!workspace) return;

      // Images are read-only in this view
      if (isImageFile(filePath)) return;

      const content = fileContentsRef.current.get(filePath) ?? '';
      try {
        await api.writeProjectFile(filePath, content, workspace.path);
        setOpenEditorTabs(
          openEditorTabs.map((t) =>
            t.path === filePath ? { ...t, isDirty: false } : t,
          ),
        );
      } catch (err) {
        const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to save file';
        toast.error(msg);
      }
    },
    [workspace, openEditorTabs, setOpenEditorTabs],
  );

  // ── Build & Run ──

  const handleBuild = useCallback(async () => {
    await buildPlayground();
  }, []);

  const handleRun = useCallback(async () => {
    await runPlayground();
  }, []);

  // ── File tree operations ──

  const handleRefreshTree = useCallback(async () => {
    await refreshPlaygroundTree();
  }, []);

  const handleNewFile = useCallback(
    async (parentPath: string, fileName: string) => {
      if (!workspace) return;
      const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
      try {
        await api.writeProjectFile(filePath, '', workspace.path);
        await handleRefreshTree();
      } catch (err) {
        toast.error(
          typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to create file',
        );
      }
    },
    [workspace, handleRefreshTree],
  );

  const handleNewFolder = useCallback(
    async (parentPath: string, folderName: string) => {
      if (!workspace) return;
      const dirPath = parentPath ? `${parentPath}/${folderName}` : folderName;
      try {
        await api.createDirectory(dirPath, workspace.path);
        await handleRefreshTree();
      } catch (err) {
        toast.error(
          typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to create folder',
        );
      }
    },
    [workspace, handleRefreshTree],
  );

  const handleDeleteFile = useCallback(
    async (filePath: string) => {
      if (!workspace) return;
      try {
        await api.deleteProjectFile(filePath, workspace.path);
        // Close editor tabs for deleted file(s)
        const cache = fileContentsRef.current;
        const remaining = openEditorTabs.filter((t) => {
          const shouldClose = t.path === filePath || t.path.startsWith(filePath + '/');
          if (shouldClose) cache.delete(t.path);
          return !shouldClose;
        });
        const isActiveGone = !remaining.some((t) => t.path === activeEditorPath);
        const newActivePath = isActiveGone
          ? remaining.length > 0
            ? remaining[remaining.length - 1].path
            : null
          : activeEditorPath;
        setOpenEditorTabs(remaining);
        setActiveEditorPath(newActivePath);
        await handleRefreshTree();
      } catch (err) {
        toast.error(
          typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to delete file',
        );
      }
    },
    [workspace, openEditorTabs, activeEditorPath, setOpenEditorTabs, setActiveEditorPath, handleRefreshTree],
  );

  const handleRenameFile = useCallback(
    async (oldPath: string, newName: string) => {
      if (!workspace) return;
      const parts = oldPath.split('/');
      parts[parts.length - 1] = newName;
      const newPath = parts.join('/');
      try {
        await api.renameProjectFile(oldPath, newPath, workspace.path);
        // Update editor tabs
        const cache = fileContentsRef.current;
        const updatedTabs = openEditorTabs.map((t) => {
          if (t.path === oldPath) {
            // Single file rename
            const content = cache.get(oldPath);
            cache.delete(oldPath);
            if (content !== undefined) cache.set(newPath, content);
            return {
              path: newPath,
              name: newName,
              language: getLanguageFromPath(newPath),
              isDirty: t.isDirty,
            };
          }
          if (t.path.startsWith(oldPath + '/')) {
            // Folder rename — update prefix
            const suffix = t.path.slice(oldPath.length);
            const updatedPath = newPath + suffix;
            const content = cache.get(t.path);
            cache.delete(t.path);
            if (content !== undefined) cache.set(updatedPath, content);
            return { ...t, path: updatedPath };
          }
          return t;
        });
        const newActivePath =
          activeEditorPath === oldPath
            ? newPath
            : activeEditorPath?.startsWith(oldPath + '/')
              ? newPath + activeEditorPath.slice(oldPath.length)
              : activeEditorPath;
        setOpenEditorTabs(updatedTabs);
        setActiveEditorPath(newActivePath);
        await handleRefreshTree();
      } catch (err) {
        toast.error(
          typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to rename file',
        );
      }
    },
    [workspace, openEditorTabs, activeEditorPath, setOpenEditorTabs, setActiveEditorPath, handleRefreshTree],
  );

  // ── Editor tab management ──

  const setActiveEditorTab = useCallback(
    (path: string) => {
      setActiveEditorPath(path);
    },
    [setActiveEditorPath],
  );

  // ── Write build output to the global footer terminal ──
  const writeStore = useGlobalTerminalStore((s) => s.writeln);
  const lastBuildOutputRef = useRef('');

  useEffect(() => {
    if (isBuilding) {
      const lastEntry = buildHistory.length > 0 ? buildHistory[buildHistory.length - 1] : null;
      const cmd = lastEntry?.command ?? '';
      const key = `building:${cmd}`;
      if (key === lastBuildOutputRef.current) return;
      lastBuildOutputRef.current = key;
      writeStore(`\x1b[1;34m$ ${cmd}\x1b[0m`);
      writeStore('\x1b[90m...\x1b[0m');
      return;
    }

    const out = buildOutput;
    if (!out) return;

    const lastEntry = buildHistory.length > 0 ? buildHistory[buildHistory.length - 1] : null;
    const cmd = lastEntry?.command ?? '';
    const key = `${cmd}:${out.stdout}:${out.stderr}:${out.exitCode}`;
    if (key === lastBuildOutputRef.current) return;
    lastBuildOutputRef.current = key;

    writeStore(`\x1b[1;34m$ ${cmd}\x1b[0m`);

    if (out.stdout) {
      const lines = out.stdout.replace(/\r\n/g, '\n').split('\n');
      for (const line of lines) {
        writeStore(`\x1b[37m${line}\x1b[0m`);
      }
    }

    if (out.stderr) {
      const color = out.success ? '\x1b[33m' : '\x1b[31m';
      const lines = out.stderr.replace(/\r\n/g, '\n').split('\n');
      for (const line of lines) {
        writeStore(`${color}${line}\x1b[0m`);
      }
    }

    if (!out.stdout && !out.stderr) {
      writeStore('\x1b[90m(no output)\x1b[0m');
    }

    const exitColor = out.success ? '\x1b[32m' : '\x1b[31m';
    writeStore(`${exitColor}→ exit code: ${out.exitCode}\x1b[0m`);
  }, [buildOutput, isBuilding, buildHistory, writeStore]);

  // ── Return ──

  return {
    // Workspace
    workspace,
    systemInfo,
    isLoadingSystemInfo,
    systemInfoError,
    recentFolders,
    activeSidebarTab,
    setActiveSidebarTab,

    // Editor state
    fileTree,
    openTabs: openEditorTabs,
    activeTabPath: activeEditorPath,
    activeContent,
    activeLanguage,
    buildOutput,
    isBuilding,
    buildHistory,

    // Actions
    handleOpenFolder,
    handleOpenRecentFolder,
    handleCloseFolder,
    handleCreateProject,
    handleOpenFile,
    handleOpenDiff,
    handleTabClose,
    handleContentChange,
    handleSaveFile,
    handleBuild,
    handleRun,
    handleRefreshTree,
    handleNewFile,
    handleNewFolder,
    handleDeleteFile,
    handleRenameFile,
    setActiveEditorTab,
    clearBuildHistory,
  };
}
