'use client';

import { TabbedPageLayout } from "@/components/tabs-layout/tabbed-page-layout";
import { Card } from "@/components/ui/card";
import { ContextMenuItem } from "@/components/ui/context-menu";
import { LogFilters } from "./components/log-table/log-filters";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { TreeView } from "./components/tree-view";
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
    sitemapVisible,
    setSitemapVisible,
    shouldShowSitemap,
    handleTreeSelect,
    sendScopeToDocuments,
  } = useHttpHistoryPage();

  return (
    <TabbedPageLayout
      tabs={tabs}
      activeTabId={activeTabId}
      onTabChange={setActiveTabId}
      onTabClose={removeTab}
      renderTabContextMenuItems={(tab) =>
        tab.id === 'all-scope' ? null : (
          <ContextMenuItem onClick={() => sendScopeToDocuments(tab.id)}>
            Send scope to Documents
          </ContextMenuItem>
        )
      }
      contentClassName="flex-1 flex flex-col overflow-hidden bg-background min-h-0"
    >
      <LogFilters
        historyMode={historyMode}
        setHistoryMode={setHistoryMode}
        sitemapVisible={sitemapVisible}
        setSitemapVisible={setSitemapVisible}
      />
      <Card className="flex-1 flex flex-col overflow-hidden mt-3 !py-0">
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          {shouldShowSitemap && (
            <>
              <ResizablePanel defaultSize={20} minSize={20}>
                <TreeView onSelectEndpoint={handleTreeSelect} selectedId={null} />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}
          <ResizablePanel defaultSize={shouldShowSitemap ? 80 : 100}>
            {historyMode === 'http' ? <HttpHistoryView /> : <WebSocketHistoryView />}
          </ResizablePanel>
        </ResizablePanelGroup>
      </Card>
    </TabbedPageLayout>
  );
}
