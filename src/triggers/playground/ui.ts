import { usePlaygroundStore } from '@/stores/playground';
import * as api from '@/pages/code/api';
import { useGlobalTerminalStore } from '@/stores/global-terminal';
import { toast } from 'sonner';
import { ask } from '@tauri-apps/plugin-dialog';

export async function buildPlayground(): Promise<void> {
  const store = usePlaygroundStore.getState();
  const workspace = store.workspace;
  const isBuilding = store.isBuilding;

  if (!workspace || !['rust', 'c', 'cpp'].includes(workspace.language)) return;
  if (isBuilding) return;

  // Auto-open terminal
  useGlobalTerminalStore.getState().requestOpen();

  store.setIsBuilding(true);
  store.setBuildOutput(null);

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
}

export async function runPlayground(): Promise<void> {
  const store = usePlaygroundStore.getState();
  const workspace = store.workspace;
  const isBuilding = store.isBuilding;

  if (!workspace || !['rust', 'c', 'cpp'].includes(workspace.language)) return;
  if (isBuilding) return;

  // Auto-open terminal
  useGlobalTerminalStore.getState().requestOpen();

  store.setIsBuilding(true);
  store.setBuildOutput(null);

  const command = workspace.language === 'rust' ? 'cargo' : './main';
  const args = workspace.language === 'rust' ? ['run'] : [];

  try {
    const output = await api.runBuildCommand(workspace.path, command, args);
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
}

export async function refreshPlaygroundTree(): Promise<void> {
  const store = usePlaygroundStore.getState();
  const workspace = store.workspace;
  if (!workspace) return;

  try {
    const tree = await api.listProjectFiles(workspace.path);
    store.setFileTree(tree);
  } catch (err) {
    toast.error(
      typeof err === 'string' ? err : err instanceof Error ? err.message : 'Failed to refresh file tree',
    );
  }
}

export async function closePlaygroundFolder(): Promise<void> {
  const confirmed = await ask('Are you sure you want to close the folder? Any unsaved changes will be lost.', {
    title: 'Close Folder',
    kind: 'warning',
  });
  if (!confirmed) return;

  const store = usePlaygroundStore.getState();
  store.setWorkspace(null);
  store.setFileTree([]);
  store.setOpenEditorTabs([]);
  store.setActiveEditorPath(null);
  store.setBuildOutput(null);
  store.clearBuildHistory();
}
