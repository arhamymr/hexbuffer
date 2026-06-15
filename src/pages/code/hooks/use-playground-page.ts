import { useCallback, useEffect, useRef, useMemo } from 'react';
import { usePlaygroundStore } from '@/stores/playground';
import { useShallow } from 'zustand/react/shallow';
import * as api from '../api';
import {
  getLanguageFromPath,
  detectWorkspaceLanguage,
  type OpenTab,
  type PlaygroundLanguage,
  type WorkspaceFolder,
} from '../types';
import { toast } from 'sonner';
import { open as openDialog } from '@tauri-apps/plugin-dialog';

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
    setWorkspace(null);
    setFileTree([]);
    setOpenEditorTabs([]);
    setActiveEditorPath(null);
    setBuildOutput(null);
    clearBuildHistory();
    fileContentsRef.current.clear();
  }, [setWorkspace, setFileTree, setOpenEditorTabs, setActiveEditorPath, setBuildOutput, clearBuildHistory]);

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
    if (!workspace || workspace.language === 'unknown') return;
    if (isBuilding) return;

    setIsBuilding(true);
    setBuildOutput(null);

    const command =
      workspace.language === 'rust'
        ? 'cargo'
        : workspace.language === 'cpp'
          ? 'clang++'
          : 'gcc';
    const args =
      workspace.language === 'rust'
        ? ['build']
        : workspace.language === 'cpp'
          ? ['main.cpp', '-o', 'main']
          : ['main.c', '-o', 'main'];

    try {
      const output = await api.runBuildCommand(workspace.path, command, args);
      setBuildOutput(output);
      addBuildHistory({
        timestamp: Date.now(),
        command: `${command} ${args.join(' ')}`,
        output,
      });
    } catch (err) {
      const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Build failed';
      setBuildOutput({
        stdout: '',
        stderr: msg,
        exitCode: -1,
        success: false,
      });
    } finally {
      setIsBuilding(false);
    }
  }, [workspace, isBuilding, setIsBuilding, setBuildOutput, addBuildHistory]);

  const handleRun = useCallback(async () => {
    if (!workspace || workspace.language === 'unknown') return;
    if (isBuilding) return;

    setIsBuilding(true);
    setBuildOutput(null);

    const command = workspace.language === 'rust' ? 'cargo' : './main';
    const args = workspace.language === 'rust' ? ['run'] : [];

    try {
      const output = await api.runBuildCommand(workspace.path, command, args);
      setBuildOutput(output);
      addBuildHistory({
        timestamp: Date.now(),
        command: `${command} ${args.join(' ')}`,
        output,
      });
    } catch (err) {
      const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Run failed';
      setBuildOutput({
        stdout: '',
        stderr: msg,
        exitCode: -1,
        success: false,
      });
    } finally {
      setIsBuilding(false);
    }
  }, [workspace, isBuilding, setIsBuilding, setBuildOutput, addBuildHistory]);

  // ── File tree operations ──

  const handleRefreshTree = useCallback(async () => {
    if (!workspace) return;
    try {
      const tree = await api.listProjectFiles(workspace.path);
      setFileTree(tree);
    } catch (err) {
      toast.error(
        typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to refresh file tree',
      );
    }
  }, [workspace, setFileTree]);

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

  // ── Return ──

  return {
    // Workspace
    workspace,
    systemInfo,
    isLoadingSystemInfo,
    systemInfoError,
    recentFolders,

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
