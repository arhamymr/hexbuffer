import { useCallback, useEffect, useRef, useMemo } from 'react';
import { usePlaygroundStore } from '@/stores/playground';
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
  const store = usePlaygroundStore();

  // File contents cache: filePath → content
  const fileContentsRef = useRef<Map<string, string>>(new Map());

  // Load system info on mount
  useEffect(() => {
    store.loadSystemInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If workspace is persisted (from store hydration), reload file tree on mount
  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;
    const ws = store.workspace;
    if (ws?.path) {
      void loadWorkspaceTree(ws.path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ──

  const loadWorkspaceTree = useCallback(
    async (folderPath: string) => {
      store.setIsLoadingFileTree(true);
      try {
        const tree = await api.listProjectFiles(folderPath);
        store.setFileTree(tree);
        // Detect language from tree
        const lang = detectWorkspaceLanguage(tree);
        const ws = store.workspace;
        if (ws && ws.path === folderPath && ws.language !== lang) {
          store.setWorkspace({ ...ws, language: lang });
        }
      } catch (err) {
        toast.error(
          typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to load folder',
        );
      } finally {
        store.setIsLoadingFileTree(false);
      }
    },
    [store],
  );

  // ── Derived data ──

  const activeContent = useMemo(() => {
    const ap = store.activeEditorPath;
    if (!ap) return '';
    return fileContentsRef.current.get(ap) ?? '';
  }, [store.activeEditorPath, store.openEditorTabs]);

  const activeLanguage = useMemo(() => {
    const tab = store.openEditorTabs.find((t) => t.path === store.activeEditorPath);
    return tab?.language ?? '';
  }, [store.openEditorTabs, store.activeEditorPath]);

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

      store.setWorkspace(workspace);
      store.setFileTree([]);
      store.setOpenEditorTabs([]);
      store.setActiveEditorPath(null);
      store.setBuildOutput(null);
      store.clearBuildHistory();
      fileContentsRef.current.clear();
      store.addRecentFolder(folderPath);

      // Load tree and detect language
      store.setIsLoadingFileTree(true);
      const tree = await api.listProjectFiles(folderPath);
      store.setFileTree(tree);
      const lang = detectWorkspaceLanguage(tree);
      store.setWorkspace({ ...workspace, language: lang });
      store.setIsLoadingFileTree(false);
    } catch (err) {
      const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to open folder';
      toast.error(msg);
    }
  }, [store]);

  const handleOpenRecentFolder = useCallback(
    async (folderPath: string) => {
      try {
        const name = folderPath.split('/').pop() ?? folderPath;
        const workspace: WorkspaceFolder = { name, path: folderPath, language: 'unknown' };

        store.setWorkspace(workspace);
        store.setFileTree([]);
        store.setOpenEditorTabs([]);
        store.setActiveEditorPath(null);
        store.setBuildOutput(null);
        store.clearBuildHistory();
        fileContentsRef.current.clear();
        store.addRecentFolder(folderPath);

        store.setIsLoadingFileTree(true);
        const tree = await api.listProjectFiles(folderPath);
        store.setFileTree(tree);
        const lang = detectWorkspaceLanguage(tree);
        store.setWorkspace({ ...workspace, language: lang });
        store.setIsLoadingFileTree(false);
      } catch (err) {
        const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to open folder';
        toast.error(msg);
        // Remove stale path from recents
        store.removeRecentFolder(folderPath);
      }
    },
    [store],
  );

  const handleCloseFolder = useCallback(() => {
    store.setWorkspace(null);
    store.setFileTree([]);
    store.setOpenEditorTabs([]);
    store.setActiveEditorPath(null);
    store.setBuildOutput(null);
    store.clearBuildHistory();
    fileContentsRef.current.clear();
  }, [store]);

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
        store.setWorkspace(workspace);
        store.setOpenEditorTabs([]);
        store.setActiveEditorPath(null);
        store.setBuildOutput(null);
        store.clearBuildHistory();
        fileContentsRef.current.clear();
        store.addRecentFolder(project.path);

        // Load tree
        store.setIsLoadingFileTree(true);
        const tree = await api.listProjectFiles(project.path);
        store.setFileTree(tree);
        store.setIsLoadingFileTree(false);

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
          store.setOpenEditorTabs([openTab]);
          store.setActiveEditorPath(wanted.path);
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

  // ── File operations ──

  const handleOpenFile = useCallback(
    async (filePath: string) => {
      const ws = store.workspace;
      if (!ws) return;

      const cache = fileContentsRef.current;
      if (cache.has(filePath)) {
        // Already cached — just select it
        const alreadyOpen = store.openEditorTabs.some((t) => t.path === filePath);
        if (alreadyOpen) {
          store.setActiveEditorPath(filePath);
          return;
        }
        const newTab: OpenTab = {
          path: filePath,
          name: filePath.split('/').pop() ?? filePath,
          language: getLanguageFromPath(filePath),
          isDirty: false,
        };
        store.setOpenEditorTabs([...store.openEditorTabs, newTab]);
        store.setActiveEditorPath(filePath);
        return;
      }

      try {
        const result = await api.readProjectFile(filePath, ws.path);
        cache.set(filePath, result.content);

        const alreadyOpen = store.openEditorTabs.some((t) => t.path === filePath);
        if (alreadyOpen) {
          store.setActiveEditorPath(filePath);
          return;
        }
        const newTab: OpenTab = {
          path: filePath,
          name: filePath.split('/').pop() ?? filePath,
          language: getLanguageFromPath(filePath),
          isDirty: false,
        };
        store.setOpenEditorTabs([...store.openEditorTabs, newTab]);
        store.setActiveEditorPath(filePath);
      } catch (err) {
        const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to open file';
        toast.error(msg);
      }
    },
    [store],
  );

  const handleTabClose = useCallback(
    (filePath: string) => {
      const cache = fileContentsRef.current;
      cache.delete(filePath);
      const remaining = store.openEditorTabs.filter((t) => t.path !== filePath);
      const newActivePath =
        store.activeEditorPath === filePath
          ? remaining.length > 0
            ? remaining[remaining.length - 1].path
            : null
          : store.activeEditorPath;
      store.setOpenEditorTabs(remaining);
      store.setActiveEditorPath(newActivePath);
    },
    [store],
  );

  const handleContentChange = useCallback(
    (filePath: string, content: string) => {
      fileContentsRef.current.set(filePath, content);
      store.setOpenEditorTabs(
        store.openEditorTabs.map((t) =>
          t.path === filePath ? { ...t, isDirty: true } : t,
        ),
      );
    },
    [store],
  );

  const handleSaveFile = useCallback(
    async (filePath: string) => {
      const ws = store.workspace;
      if (!ws) return;

      const content = fileContentsRef.current.get(filePath) ?? '';
      try {
        await api.writeProjectFile(filePath, content, ws.path);
        store.setOpenEditorTabs(
          store.openEditorTabs.map((t) =>
            t.path === filePath ? { ...t, isDirty: false } : t,
          ),
        );
      } catch (err) {
        const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to save file';
        toast.error(msg);
      }
    },
    [store],
  );

  // ── Build & Run ──

  const handleBuild = useCallback(async () => {
    const ws = store.workspace;
    if (!ws || ws.language === 'unknown') return;
    if (store.isBuilding) return;

    store.setIsBuilding(true);
    store.setBuildOutput(null);

    const command =
      ws.language === 'rust'
        ? 'cargo'
        : ws.language === 'cpp'
          ? 'clang++'
          : 'gcc';
    const args =
      ws.language === 'rust'
        ? ['build']
        : ws.language === 'cpp'
          ? ['main.cpp', '-o', 'main']
          : ['main.c', '-o', 'main'];

    try {
      const output = await api.runBuildCommand(ws.path, command, args);
      store.setBuildOutput(output);
      store.addBuildHistory({
        timestamp: Date.now(),
        command: `${command} ${args.join(' ')}`,
        output,
      });
    } catch (err) {
      const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Build failed';
      store.setBuildOutput({
        stdout: '',
        stderr: msg,
        exitCode: -1,
        success: false,
      });
    } finally {
      store.setIsBuilding(false);
    }
  }, [store]);

  const handleRun = useCallback(async () => {
    const ws = store.workspace;
    if (!ws || ws.language === 'unknown') return;
    if (store.isBuilding) return;

    store.setIsBuilding(true);
    store.setBuildOutput(null);

    const command = ws.language === 'rust' ? 'cargo' : './main';
    const args = ws.language === 'rust' ? ['run'] : [];

    try {
      const output = await api.runBuildCommand(ws.path, command, args);
      store.setBuildOutput(output);
      store.addBuildHistory({
        timestamp: Date.now(),
        command: `${command} ${args.join(' ')}`,
        output,
      });
    } catch (err) {
      const msg = typeof err === 'string' ? err : err instanceof Error ? err.message : 'Run failed';
      store.setBuildOutput({
        stdout: '',
        stderr: msg,
        exitCode: -1,
        success: false,
      });
    } finally {
      store.setIsBuilding(false);
    }
  }, [store]);

  // ── File tree operations ──

  const handleRefreshTree = useCallback(async () => {
    const ws = store.workspace;
    if (!ws) return;
    try {
      const tree = await api.listProjectFiles(ws.path);
      store.setFileTree(tree);
    } catch (err) {
      toast.error(
        typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to refresh file tree',
      );
    }
  }, [store]);

  const handleNewFile = useCallback(
    async (parentPath: string, fileName: string) => {
      const ws = store.workspace;
      if (!ws) return;
      const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
      try {
        await api.writeProjectFile(filePath, '', ws.path);
        await handleRefreshTree();
      } catch (err) {
        toast.error(
          typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to create file',
        );
      }
    },
    [store, handleRefreshTree],
  );

  const handleNewFolder = useCallback(
    async (parentPath: string, folderName: string) => {
      const ws = store.workspace;
      if (!ws) return;
      const dirPath = parentPath ? `${parentPath}/${folderName}` : folderName;
      try {
        await api.createDirectory(dirPath, ws.path);
        await handleRefreshTree();
      } catch (err) {
        toast.error(
          typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to create folder',
        );
      }
    },
    [store, handleRefreshTree],
  );

  const handleDeleteFile = useCallback(
    async (filePath: string) => {
      const ws = store.workspace;
      if (!ws) return;
      try {
        await api.deleteProjectFile(filePath, ws.path);
        // Close editor tabs for deleted file(s)
        const cache = fileContentsRef.current;
        const remaining = store.openEditorTabs.filter((t) => {
          const shouldClose = t.path === filePath || t.path.startsWith(filePath + '/');
          if (shouldClose) cache.delete(t.path);
          return !shouldClose;
        });
        const isActiveGone = !remaining.some((t) => t.path === store.activeEditorPath);
        const newActivePath = isActiveGone
          ? remaining.length > 0
            ? remaining[remaining.length - 1].path
            : null
          : store.activeEditorPath;
        store.setOpenEditorTabs(remaining);
        store.setActiveEditorPath(newActivePath);
        await handleRefreshTree();
      } catch (err) {
        toast.error(
          typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to delete file',
        );
      }
    },
    [store, handleRefreshTree],
  );

  const handleRenameFile = useCallback(
    async (oldPath: string, newName: string) => {
      const ws = store.workspace;
      if (!ws) return;
      const parts = oldPath.split('/');
      parts[parts.length - 1] = newName;
      const newPath = parts.join('/');
      try {
        await api.renameProjectFile(oldPath, newPath, ws.path);
        // Update editor tabs
        const cache = fileContentsRef.current;
        const updatedTabs = store.openEditorTabs.map((t) => {
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
          store.activeEditorPath === oldPath
            ? newPath
            : store.activeEditorPath?.startsWith(oldPath + '/')
              ? newPath + store.activeEditorPath.slice(oldPath.length)
              : store.activeEditorPath;
        store.setOpenEditorTabs(updatedTabs);
        store.setActiveEditorPath(newActivePath);
        await handleRefreshTree();
      } catch (err) {
        toast.error(
          typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to rename file',
        );
      }
    },
    [store, handleRefreshTree],
  );

  // ── Editor tab management ──

  const setActiveEditorTab = useCallback(
    (path: string) => {
      store.setActiveEditorPath(path);
    },
    [store],
  );

  // ── Return ──

  return {
    // Workspace
    workspace: store.workspace,
    systemInfo: store.systemInfo,
    isLoadingSystemInfo: store.isLoadingSystemInfo,
    systemInfoError: store.systemInfoError,
    recentFolders: store.recentFolders,

    // Editor state
    fileTree: store.fileTree,
    openTabs: store.openEditorTabs,
    activeTabPath: store.activeEditorPath,
    activeContent,
    activeLanguage,
    buildOutput: store.buildOutput,
    isBuilding: store.isBuilding,
    buildHistory: store.buildHistory,

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
    clearBuildHistory: store.clearBuildHistory,
  };
}
