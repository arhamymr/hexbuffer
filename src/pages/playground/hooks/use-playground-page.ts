import { useCallback, useEffect, useRef, useMemo } from 'react';
import { usePlaygroundStore } from '@/stores/playground';
import * as api from '../api';
import type { PlaygroundLanguage, OpenTab } from '../types';
import { toast } from 'sonner';

export function usePlaygroundPage() {
  const store = usePlaygroundStore();

  // File contents cache (not in store — managed by CodeMirror via TextEditor)
  const fileContentsRef = useRef<Map<string, string>>(new Map());

  // Load system info on mount
  useEffect(() => {
    store.loadSystemInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── File operations ──

  const handleOpenFile = useCallback(
    async (filePath: string) => {
      const { project } = usePlaygroundStore.getState();
      if (!project) return;

      // Already cached?
      if (fileContentsRef.current.has(filePath)) {
        store.openFile(filePath);
        return;
      }

      try {
        const result = await api.readProjectFile(filePath, project.path);
        fileContentsRef.current.set(filePath, result.content);
        store.openFile(filePath);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to open file',
        );
      }
    },
    [store],
  );

  const handleTabClose = useCallback(
    (filePath: string) => {
      const tab = store.openTabs.find((t) => t.path === filePath);
      if (tab?.isDirty) {
        fileContentsRef.current.delete(filePath);
      }
      store.closeTab(filePath);
    },
    [store],
  );

  const handleContentChange = useCallback(
    (filePath: string, content: string) => {
      fileContentsRef.current.set(filePath, content);
      store.markTabDirty(filePath, true);
    },
    [store],
  );

  const handleSaveFile = useCallback(
    async (filePath: string) => {
      const { project } = usePlaygroundStore.getState();
      if (!project) return;

      const content = fileContentsRef.current.get(filePath) ?? '';
      try {
        await api.writeProjectFile(filePath, content, project.path);
        store.markTabClean(filePath);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to save file',
        );
      }
    },
    [store],
  );

  // ── Build & Run ──

  const handleBuild = useCallback(async () => {
    const { project } = usePlaygroundStore.getState();
    if (!project || store.isBuilding) return;

    store.setIsBuilding(true);
    store.setBuildOutput(null);

    const command = project.language === 'rust' ? 'cargo' : project.language === 'cpp' ? 'clang++' : 'gcc';
    const args =
      project.language === 'rust'
        ? ['build']
        : project.language === 'cpp'
          ? ['main.cpp', '-o', 'main']
          : ['main.c', '-o', 'main'];

    try {
      const output = await api.runBuildCommand(project.path, command, args);
      store.setBuildOutput(output);
      store.addBuildHistory({ timestamp: Date.now(), command: `${command} ${args.join(' ')}`, output });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Build failed';
      store.setBuildOutput({ stdout: '', stderr: msg, exitCode: -1, success: false });
    } finally {
      store.setIsBuilding(false);
    }
  }, [store]);

  const handleRun = useCallback(async () => {
    const { project } = usePlaygroundStore.getState();
    if (!project || store.isBuilding) return;

    store.setIsBuilding(true);
    store.setBuildOutput(null);

    const command = project.language === 'rust' ? 'cargo' : './main';
    const args = project.language === 'rust' ? ['run'] : [];

    try {
      const output = await api.runBuildCommand(project.path, command, args);
      store.setBuildOutput(output);
      store.addBuildHistory({ timestamp: Date.now(), command: `${command} ${args.join(' ')}`, output });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Run failed';
      store.setBuildOutput({ stdout: '', stderr: msg, exitCode: -1, success: false });
    } finally {
      store.setIsBuilding(false);
    }
  }, [store]);

  // ── Project actions ──

  const handleCreateProject = useCallback(
    async (name: string, language: PlaygroundLanguage) => {
      try {
        await store.createProject(name, language);
        // Load main file content into cache
        const { project, openTabs } = usePlaygroundStore.getState();
        if (project && openTabs.length > 0) {
          const mainPath = openTabs[0].path;
          const result = await api.readProjectFile(mainPath, project.path);
          fileContentsRef.current.set(mainPath, result.content);
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to create project',
        );
      }
    },
    [store],
  );

  const handleCloseProject = useCallback(() => {
    fileContentsRef.current.clear();
    store.resetProject();
  }, [store]);

  const handleRefreshTree = useCallback(() => {
    store.refreshFileTree();
  }, [store]);

  const handleNewFile = useCallback(
    async (parentPath: string, fileName: string) => {
      const { project } = usePlaygroundStore.getState();
      if (!project) return;
      const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
      try {
        await api.writeProjectFile(filePath, '', project.path);
        store.refreshFileTree();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to create file',
        );
      }
    },
    [store],
  );

  const handleDeleteFile = useCallback(
    async (filePath: string) => {
      const { project } = usePlaygroundStore.getState();
      if (!project) return;
      try {
        await api.deleteProjectFile(filePath, project.path);
        // Close tab if file was open
        const tab = store.openTabs.find((t) => t.path === filePath);
        if (tab) {
          fileContentsRef.current.delete(filePath);
          store.closeTab(filePath);
        }
        store.refreshFileTree();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to delete file',
        );
      }
    },
    [store],
  );

  const handleRenameFile = useCallback(
    async (oldPath: string, newName: string) => {
      const { project } = usePlaygroundStore.getState();
      if (!project) return;
      const parts = oldPath.split('/');
      parts[parts.length - 1] = newName;
      const newPath = parts.join('/');
      try {
        await api.renameProjectFile(oldPath, newPath, project.path);
        // Update tabs if file was open
        const tab = store.openTabs.find((t) => t.path === oldPath);
        if (tab) {
          const content = fileContentsRef.current.get(oldPath);
          fileContentsRef.current.delete(oldPath);
          if (content !== undefined) {
            fileContentsRef.current.set(newPath, content);
          }
          store.closeTab(oldPath);
          store.openFile(newPath);
        }
        store.refreshFileTree();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to rename file',
        );
      }
    },
    [store],
  );

  // ── Derived data ──

  const tabs: OpenTab[] = useMemo(() => store.openTabs, [store.openTabs]);

  const activeContent = useMemo(() => {
    const ap = store.activeTabPath;
    if (!ap) return '';
    return fileContentsRef.current.get(ap) ?? '';
  }, [store.activeTabPath, store.openTabs]);

  const activeLanguage = useMemo(() => {
    const tab = store.openTabs.find((t) => t.path === store.activeTabPath);
    return tab?.language ?? '';
  }, [store.activeTabPath, store.openTabs]);

  return {
    // State
    project: store.project,
    systemInfo: store.systemInfo,
    isLoadingSystemInfo: store.isLoadingSystemInfo,
    systemInfoError: store.systemInfoError,
    fileTree: store.fileTree,
    openTabs: tabs,
    activeTabPath: store.activeTabPath,
    activeContent,
    activeLanguage,
    buildOutput: store.buildOutput,
    isBuilding: store.isBuilding,
    buildHistory: store.buildHistory,

    // Actions
    handleCreateProject,
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
    setActiveTab: store.setActiveTab,
    clearBuildHistory: store.clearBuildHistory,
  };
}
