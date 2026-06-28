import React from 'react';
import { useRepeaterStore } from '@/stores/repeater';
import { useCollectionsStore } from '@/stores/collections';
import { invoke } from '@tauri-apps/api/core';
import type { PageTabItem } from '@/components/tabs-layout/types';

export function useRepeaterPage() {
  const workspaces = useRepeaterStore((s) => s.workspaces);
  const activeWorkspaceId = useRepeaterStore((s) => s.activeWorkspaceId);
  const createWorkspace = useRepeaterStore((s) => s.createWorkspace);
  const renameWorkspace = useRepeaterStore((s) => s.renameWorkspace);
  const deleteWorkspace = useRepeaterStore((s) => s.deleteWorkspace);
  const setActiveWorkspaceId = useRepeaterStore((s) => s.setActiveWorkspaceId);
  const closeTabsToLeft = useRepeaterStore((s) => s.closeTabsToLeft);
  const closeTabsToRight = useRepeaterStore((s) => s.closeTabsToRight);

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
  }, [workspaces.length, isHydrated, createWorkspace]);

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
    (id: string) => setActiveWorkspaceId(id),
    [setActiveWorkspaceId],
  );

  const onTabRename = React.useCallback(
    (id: string, name: string) => renameWorkspace(id, name),
    [renameWorkspace],
  );

  const onTabClose = React.useCallback(
    (id: string) => deleteWorkspace(id),
    [deleteWorkspace],
  );

  const onTabAdd = React.useCallback(() => {
    createWorkspace();
  }, [createWorkspace]);

  const onCloseTabsToLeft = React.useCallback(
    (id: string) => closeTabsToLeft(id),
    [closeTabsToLeft],
  );

  const onCloseTabsToRight = React.useCallback(
    (id: string) => closeTabsToRight(id),
    [closeTabsToRight],
  );

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
