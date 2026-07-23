import * as React from 'react';
import { PushPinSimpleIcon } from '@phosphor-icons/react';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import type { PageTabItem } from '@/components/tabs-layout/types';
import { Card } from '@/components/ui/card';
import { ContextMenuItem } from '@/components/ui/context-menu';
import { LogFilters, HttpHistoryView, CreateGroupDialog, TargetSelectorDialog } from './components';
import {
  useHttpHistoryPage,
  ALL_HISTORY_TAB_ID,
  GROUP_TAB_PREFIX,
} from './hooks/use-http-history-page';

export function HttpHistoryPage() {
  const page = useHttpHistoryPage();

  const formattedTabs = React.useMemo<PageTabItem[]>(
    () =>
      page.tabs.map((tab) => {
        let indicator: React.ReactNode = undefined;
        if (tab.type === 'pinned') {
          indicator = <PushPinSimpleIcon className="size-3 text-amber-500" />;
        } else if (tab.type === 'group' && tab.color) {
          indicator = <span className="size-2 rounded-full" style={{ backgroundColor: tab.color }} />;
        }

        return {
          id: tab.id,
          name: tab.name,
          closable: tab.closable,
          indicator,
        };
      }),
    [page.tabs]
  );

  const renderTabContextMenuItems = React.useCallback(
    (tab: { id: string }) => {
      if (tab.id === ALL_HISTORY_TAB_ID) return null;
      if (tab.id.startsWith(GROUP_TAB_PREFIX)) {
        const groupId = tab.id.slice(GROUP_TAB_PREFIX.length);
        return (
          <ContextMenuItem
            onClick={() => {
              page.deleteGroup(groupId);
              page.setActiveTabId(ALL_HISTORY_TAB_ID);
            }}
            variant="destructive"
          >
            Clear Group
          </ContextMenuItem>
        );
      }
      return (
        <ContextMenuItem onClick={() => page.sendScopeToDocuments(tab.id)}>
          Send scope to Documents
        </ContextMenuItem>
      );
    },
    [page.deleteGroup, page.setActiveTabId, page.sendScopeToDocuments]
  );

  return (
    <>
      <TabbedPageLayout
        tabs={formattedTabs}
        activeTabId={page.activeTabId}
        onTabChange={page.setActiveTabId}
        onTabClose={page.removeTab}
        onTabRename={page.renameTab}
        onTabAdd={page.addGroup}
        renderTabContextMenuItems={renderTabContextMenuItems}
        contentClassName="flex-1 border rounded-lg flex flex-col overflow-hidden bg-background min-h-0"
      >
        <LogFilters />
        <Card className="flex-1 flex flex-col overflow-hidden !py-0 rounded-none">
          <HttpHistoryView
            isPinnedTabActive={page.isPinnedTabActive}
            isGroupTabActive={page.isGroupTabActive}
            activeGroupId={page.activeGroupId}
          />
        </Card>
      </TabbedPageLayout>

      <CreateGroupDialog
        open={page.isGroupDialogOpen}
        onOpenChange={page.setIsGroupDialogOpen}
      />
      <TargetSelectorDialog
        externalOpen={page.isTargetSelectorOpen}
        onExternalOpenChange={(open) => {
          if (!open) page.closeTargetSelector();
        }}
      />
    </>
  );
}
