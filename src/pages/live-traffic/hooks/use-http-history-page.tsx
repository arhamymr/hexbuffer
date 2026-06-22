import * as React from 'react';
import { Pin } from 'lucide-react';
import { useTabState } from '@/components/tabs-layout/use-tab-state';
import type { PageTabItem } from '@/components/tabs-layout/types';
import { useDocumentsStore } from '@/stores/documents';
import { useTargetStore } from '@/stores/target';
import { useFloatingBarUiStore } from '@/stores/floating-bar-ui';
import { toast } from 'sonner';
import { useHistoryQuery } from './use-history-query';
import { usePinnedRequestsStore } from '../state/pinned-requests-store';
import { useGroupsStore } from '../state/groups-store';
import { closeTargetSelector } from '@/triggers';
import { ContextMenuItem } from '@/components/ui/context-menu';
import { HttpHistoryView } from '../components/http-history-view';
import { WebSocketHistoryView } from '../components/websocket-history-view';

export type HistoryMode = 'http' | 'websocket';
const ALL_HISTORY_TAB_ID = 'all-scope';
const PINNED_TAB_ID = 'pinned';
const GROUP_TAB_PREFIX = 'group:';

export function useHttpHistoryPage() {
  const [historyMode, setHistoryMode] = React.useState<HistoryMode>(() => {
    const stored = localStorage.getItem('history-mode');
    return stored === 'websocket' ? 'websocket' : 'http';
  });

  const persistHistoryMode = React.useCallback((mode: HistoryMode) => {
    localStorage.setItem('history-mode', mode);
    setHistoryMode(mode);
  }, []);

  // Listen for external history mode changes from the floating bar
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as HistoryMode;
      setHistoryMode(detail);
    };
    window.addEventListener('history-mode-change', handler);
    return () => window.removeEventListener('history-mode-change', handler);
  }, []);

  const targets = useTargetStore((state) => state.targets);
  const removeActiveTab = useTargetStore((state) => state.removeActiveTab);
  const { setActiveScope } = useHistoryQuery();
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
  const tabs = React.useMemo<PageTabItem[]>(
    () => [
      { id: ALL_HISTORY_TAB_ID, name: 'All History', closable: false },
      ...(pinnedCount > 0
        ? [{ id: PINNED_TAB_ID, name: `Pinned (${pinnedCount})`, closable: true, indicator: React.createElement(Pin, { className: "size-3 text-amber-500" }) }]
        : []),
      ...activeTargets.map((target) => ({
        id: target.id,
        name: target.name,
      })),
      ...groups.map((g) => ({
        id: `${GROUP_TAB_PREFIX}${g.id}`,
        name: g.name,
        closable: true,
        indicator: React.createElement('span', { className: "size-2 rounded-full", style: { backgroundColor: g.color } }),
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

  // ── Target selector ──
  const isTargetSelectorOpen = useFloatingBarUiStore((s) => s.isTargetSelectorOpen);

  // ── Context menu ──
  const renderTabContextMenuItems = React.useCallback((tab: { id: string }) => {
    if (tab.id === 'all-scope') return null;
    if (tab.id.startsWith('group:')) {
      const groupId = tab.id.slice(6);
      return (
        <ContextMenuItem onClick={() => { deleteGroup(groupId); setActiveTabId('all-scope'); }} variant="destructive">
          Clear Group
        </ContextMenuItem>
      );
    }
    return (
      <ContextMenuItem onClick={() => sendScopeToDocuments(tab.id)}>
        Send scope to Documents
      </ContextMenuItem>
    );
  }, [sendScopeToDocuments, deleteGroup, setActiveTabId]);

  // ── History view memoization ──
  const historyView = React.useMemo(() =>
    historyMode === 'http'
      ? <HttpHistoryView isPinnedTabActive={isPinnedTabActive} isGroupTabActive={isGroupTabActive} activeGroupId={activeGroupId} />
      : <WebSocketHistoryView />,
    [historyMode, isPinnedTabActive, isGroupTabActive, activeGroupId]
  );

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    removeTab,
    renameTab: handleRenameTab,
    addGroup,
    historyMode,
    setHistoryMode: persistHistoryMode,
    sendScopeToDocuments,
    isPinnedTabActive,
    isGroupTabActive,
    activeGroupId,
    isGroupDialogOpen,
    setIsGroupDialogOpen,
    isTargetSelectorOpen,
    closeTargetSelector,
    renderTabContextMenuItems,
    historyView,
  };
}
