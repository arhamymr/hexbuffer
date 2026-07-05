import React from 'react';
import { useRepeaterStore } from '@/stores/repeater';
import { useCollectionsStore } from '@/stores/collections';
import { invoke } from '@tauri-apps/api/core';
import type { PageTabItem } from '@/components/tabs-layout/types';
import {
  createWorkspace,
  renameWorkspace,
  deleteWorkspace,
  setActiveWorkspace,
  closeWorkspacesToLeft,
  closeWorkspacesToRight,
} from '@/triggers/repeater';

export function useRepeaterPage() {
  const workspaces = useRepeaterStore((s) => s.workspaces);
  const activeWorkspaceId = useRepeaterStore((s) => s.activeWorkspaceId);

  const stashes = useCollectionsStore((s) => s.stashes);
  const isHydrated = useCollectionsStore((s) => s.isHydrated);
  const fetchFromDb = useCollectionsStore((s) => s.fetchFromDb);

  const migrationDoneRef = React.useRef(false);

  // Hydrate collections from DB on mount
  React.useEffect(() => {
    void fetchFromDb();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-create a default workspace if none exist (only after hydration + DB load)
  React.useEffect(() => {
    if (workspaces.length === 0 && isHydrated) {
      createWorkspace();
    }
  }, [workspaces.length, isHydrated]);

  // Migrate orphaned stashes (parentId === null) into the first workspace
  React.useEffect(() => {
    if (!isHydrated || workspaces.length === 0 || migrationDoneRef.current) return;

    const orphanedStashes = stashes.filter((s) => s.parentId === null);
    if (orphanedStashes.length === 0) {
      migrationDoneRef.current = true;
      return;
    }

    const defaultWorkspaceId = workspaces[0].id;

    // Run migration once: update DB for each orphan, then refresh
    (async () => {
      for (const stash of orphanedStashes) {
        await invoke('save_stash', {
          record: { ...stash, parentId: defaultWorkspaceId, updatedAt: new Date().toISOString() },
        });
      }
      // Refresh from DB after all migrations complete
      await useCollectionsStore.getState().fetchFromDb();
      migrationDoneRef.current = true;
    })();
  }, [isHydrated, workspaces, stashes]);

  const tabs: PageTabItem[] = React.useMemo(
    () =>
      workspaces.map((ws) => ({
        id: ws.id,
        name: ws.name,
      })),
    [workspaces],
  );

  const onTabChange = React.useCallback(
    (id: string) => setActiveWorkspace(id),
    [],
  );

  const onTabRename = React.useCallback(
    (id: string, name: string) => renameWorkspace(id, name),
    [],
  );

  const onTabClose = React.useCallback(
    (id: string) => deleteWorkspace(id),
    [],
  );

  const onTabAdd = React.useCallback(() => {
    createWorkspace();
  }, []);

  const onCloseTabsToLeft = React.useCallback(
    (id: string) => closeWorkspacesToLeft(id),
    [],
  );

  const onCloseTabsToRight = React.useCallback(
    (id: string) => closeWorkspacesToRight(id),
    [],
  );

  // Register Cmd+S / Ctrl+S key handler for saving active request (ponytail: simple key listener)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        const store = useCollectionsStore.getState();
        if (store.selectedNodeId?.startsWith('ep-')) {
          e.preventDefault();
          void store.saveActiveEndpoint();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    tabs,
    activeWorkspaceId,
    onTabChange,
    onTabRename,
    onTabClose,
    onTabAdd,
    onCloseTabsToLeft,
    onCloseTabsToRight,
  };
}
