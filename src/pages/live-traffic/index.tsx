'use client';

import { useCallback, useMemo } from 'react';
import { TabbedPageLayout } from "@/components/tabs-layout/tabbed-page-layout";
import { Card } from "@/components/ui/card";
import { ContextMenuItem } from "@/components/ui/context-menu";
import { LogFilters } from "./components/log-table/log-filters";
import { HttpHistoryView } from "./components/http-history-view";
import { WebSocketHistoryView } from "./components/websocket-history-view";
import { useHttpHistoryPage } from "./hooks/use-http-history-page";

export function LiveTrafficPage() {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    removeTab,
    historyMode,
    setHistoryMode,
    sendScopeToDocuments,
  } = useHttpHistoryPage();

  const renderTabContextMenuItems = useCallback((tab: { id: string }) =>
    tab.id === 'all-scope' ? null : (
      <ContextMenuItem onClick={() => sendScopeToDocuments(tab.id)}>
        Send scope to Documents
      </ContextMenuItem>
    ),
    [sendScopeToDocuments]
  );

  const historyView = useMemo(() =>
    historyMode === 'http' ? <HttpHistoryView /> : <WebSocketHistoryView />,
    [historyMode]
  );

  return (
    <TabbedPageLayout
      tabs={tabs}
      activeTabId={activeTabId}
      onTabChange={setActiveTabId}
      onTabClose={removeTab}
      renderTabContextMenuItems={renderTabContextMenuItems}
      contentClassName="flex-1 border rounded-lg flex flex-col overflow-hidden bg-background min-h-0"
    >
      <LogFilters
        historyMode={historyMode}
        setHistoryMode={setHistoryMode}
      />
      <Card className="flex-1 flex flex-col overflow-hidden !py-0 rounded-none">
        {historyView}
      </Card>
    </TabbedPageLayout>
  );
}
