'use client';

import { useCallback, useMemo } from 'react';
import { TabbedPageLayout } from "@/components/tabs-layout/tabbed-page-layout";
import { Card } from "@/components/ui/card";
import { ContextMenuItem } from "@/components/ui/context-menu";
import { LogFilters } from "./components/log-table/log-filters";
import { TargetSelectorDialog } from "./components/target-selector";
import { HttpHistoryView } from "./components/http-history-view";
import { WebSocketHistoryView } from "./components/websocket-history-view";
import { useHttpHistoryPage } from "./hooks/use-http-history-page";
import { CreateGroupDialog } from "./components/group-dialog";
import { useGroupsStore } from "./state/groups-store";
import { useFloatingBarUiStore } from '@/stores/floating-bar-ui';
import { closeTargetSelector } from '@/triggers';

export function LiveTrafficPage() {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    removeTab,
    renameTab,
    addGroup,
    historyMode,
    setHistoryMode,
    sendScopeToDocuments,
    isPinnedTabActive,
    isGroupTabActive,
    activeGroupId,
    isGroupDialogOpen,
    setIsGroupDialogOpen,
  } = useHttpHistoryPage();

  const deleteGroup = useGroupsStore((s) => s.deleteGroup);
  const isTargetSelectorOpen = useFloatingBarUiStore((s) => s.isTargetSelectorOpen);

  const renderTabContextMenuItems = useCallback((tab: { id: string }) => {
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

  const historyView = useMemo(() =>
    historyMode === 'http'
      ? <HttpHistoryView isPinnedTabActive={isPinnedTabActive} isGroupTabActive={isGroupTabActive} activeGroupId={activeGroupId} />
      : <WebSocketHistoryView />,
    [historyMode, isPinnedTabActive, isGroupTabActive, activeGroupId]
  );

  return (
    <>
      <TabbedPageLayout
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        onTabClose={removeTab}
        onTabRename={renameTab}
        onTabAdd={addGroup}
        renderTabContextMenuItems={renderTabContextMenuItems}
        contentClassName="flex-1 border rounded-lg flex flex-col overflow-hidden bg-background min-h-0"
      >
        <LogFilters historyMode={historyMode} />
        <Card className="flex-1 flex flex-col overflow-hidden !py-0 rounded-none">
          {historyView}
        </Card>
      </TabbedPageLayout>
      <CreateGroupDialog
        open={isGroupDialogOpen}
        onOpenChange={setIsGroupDialogOpen}
      />
      <TargetSelectorDialog
        externalOpen={isTargetSelectorOpen}
        onExternalOpenChange={(open) => { if (!open) closeTargetSelector(); }}
      />
    </>
  );
}
