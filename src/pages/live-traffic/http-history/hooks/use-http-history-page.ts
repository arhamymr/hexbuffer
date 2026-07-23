import * as React from 'react';
import { useTabState } from '@/components/tabs-layout/use-tab-state';
import { useDocumentsStore } from '@/stores/documents';
import { useTargetStore } from '@/stores/target';
import { useFloatingBarUiStore } from '@/stores/floating-bar-ui';
import { toast } from 'sonner';
import {
  useHttpHistoryQueryStore,
  usePinnedRequestsStore,
  useGroupsStore,
} from '@/stores/history';
import { closeTargetSelector } from '@/triggers';

export const ALL_HISTORY_TAB_ID = 'all-scope';
export const PINNED_TAB_ID = 'pinned';
export const GROUP_TAB_PREFIX = 'group:';

export interface HttpHistoryTabData {
  id: string;
  name: string;
  closable: boolean;
  type: 'all' | 'pinned' | 'target' | 'group';
  color?: string;
  pinnedCount?: number;
}

export function useHttpHistoryPage() {
  const targets = useTargetStore((state) => state.targets);
  const removeActiveTab = useTargetStore((state) => state.removeActiveTab);
  const setActiveScope = useHttpHistoryQueryStore((state) => state.setActiveScope);
  const pinnedIds = usePinnedRequestsStore((state) => state.pinnedIds);
  const unpinAll = usePinnedRequestsStore((state) => state.unpinAll);
  const pinnedCount = pinnedIds.length;

  const groups = useGroupsStore((s) => s.groups);
  const deleteGroup = useGroupsStore((s) => s.deleteGroup);
  const renameGroup = useGroupsStore((s) => s.renameGroup);

  const [isGroupDialogOpen, setIsGroupDialogOpen] = React.useState(false);
  const activeTargets = React.useMemo(
    () => targets.filter((target) => target.tabActive),
    [targets]
  );

  const tabs = React.useMemo<HttpHistoryTabData[]>(
    () => [
      { id: ALL_HISTORY_TAB_ID, name: 'All History', closable: false, type: 'all' },
      ...(pinnedCount > 0
        ? [{ id: PINNED_TAB_ID, name: `Pinned (${pinnedCount})`, closable: true, type: 'pinned' as const, pinnedCount }]
        : []),
      ...activeTargets.map((target) => ({
        id: target.id,
        name: target.name,
        closable: true,
        type: 'target' as const,
      })),
      ...groups.map((g) => ({
        id: `${GROUP_TAB_PREFIX}${g.id}`,
        name: g.name,
        closable: true,
        type: 'group' as const,
        color: g.color,
      })),
    ],
    [activeTargets, pinnedCount, groups]
  );

  const { activeTabId, setActiveTabId } = useTabState(tabs, 'http-history-target-tabs');
  const activeTab = activeTabId === ALL_HISTORY_TAB_ID
    ? null
    : activeTargets.find((target) => target.id === activeTabId);

  const isPinnedTabActive = activeTabId === PINNED_TAB_ID;
  const activeGroupId = activeTabId?.startsWith(GROUP_TAB_PREFIX) ? activeTabId.slice(GROUP_TAB_PREFIX.length) : null;
  const isGroupTabActive = activeGroupId !== null;

  const removeTab = React.useCallback((targetId: string) => {
    if (targetId === ALL_HISTORY_TAB_ID) {
      return;
    }

    if (targetId === PINNED_TAB_ID) {
      unpinAll();
      setActiveTabId(ALL_HISTORY_TAB_ID);
      return;
    }

    if (targetId.startsWith(GROUP_TAB_PREFIX)) {
      deleteGroup(targetId.slice(GROUP_TAB_PREFIX.length));
      setActiveTabId(ALL_HISTORY_TAB_ID);
      return;
    }

    removeActiveTab(targetId);
  }, [removeActiveTab, unpinAll, deleteGroup, setActiveTabId]);

  const handleRenameTab = React.useCallback((tabId: string, name: string) => {
    if (tabId.startsWith(GROUP_TAB_PREFIX)) {
      renameGroup(tabId.slice(GROUP_TAB_PREFIX.length), name);
    }
  }, [renameGroup]);

  const addGroup = React.useCallback(() => {
    setIsGroupDialogOpen(true);
  }, []);

  React.useEffect(() => {
    if (isPinnedTabActive || isGroupTabActive) {
      setActiveScope(null);
    } else {
      setActiveScope(activeTab?.scope ?? null);
    }
  }, [activeTab?.scope, setActiveScope, isPinnedTabActive, isGroupTabActive]);

  const sendScopeToDocuments = React.useCallback((targetId: string) => {
    const target = activeTargets.find((activeTarget) => activeTarget.id === targetId);

    if (!target) {
      toast.error('Target scope is unavailable');
      return;
    }

    if (target.scope.length === 0) {
      toast.error('Target has no scope patterns');
      return;
    }

    const documentsStore = useDocumentsStore.getState();
    const scopeBlock = [`## ${target.name}`, ...target.scope].join('\n');

    documentsStore.updateDocument(documentsStore.activeDocumentId, (document) => ({
      ...document,
      sections: {
        ...document.sections,
        scope: document.sections.scope.trim()
          ? `${document.sections.scope.trimEnd()}\n\n${scopeBlock}`
          : scopeBlock,
      },
      updatedAt: new Date().toISOString(),
    }));
    toast.success('Sent scope to active document');
  }, [activeTargets]);

  const isTargetSelectorOpen = useFloatingBarUiStore((s) => s.isTargetSelectorOpen);

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    removeTab,
    renameTab: handleRenameTab,
    addGroup,
    sendScopeToDocuments,
    deleteGroup,
    isPinnedTabActive,
    isGroupTabActive,
    activeGroupId,
    isGroupDialogOpen,
    setIsGroupDialogOpen,
    isTargetSelectorOpen,
    closeTargetSelector,
  };
}
