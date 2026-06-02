'use client';

import { TabbedPageLayout } from "@/components/tabs-layout/tabbed-page-layout";
import { Card } from "@/components/ui/card";
import { ContextMenuItem } from "@/components/ui/context-menu";
import { LogFilters } from "./components/log-table/log-filters";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { TreeView } from "@/components/tree-view";
import { HttpHistoryView } from "./components/http-history-view";
import { WebSocketHistoryView } from "./components/websocket-history-view";
import { useHttpHistoryPage } from "./hooks/use-http-history-page";
import { useHistoryQuery } from "./hooks/use-history-query";
import { useTreeViewData } from "./hooks/use-tree-view-data";

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
    handleHostSelect,
    sendScopeToDocuments,
  } = useHttpHistoryPage();
  const { nodes, hasActiveScope, isLoading, loadError } = useTreeViewData();
  const { filter } = useHistoryQuery();
  const activeHostFilter = filter.search.trim();
  const defaultExpandedIds = activeHostFilter
    ? nodes.filter((node) => node.label === activeHostFilter).map((node) => node.id)
    : [];

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
      contentClassName="flex-1 border rounded-lg flex flex-col overflow-hidden bg-background min-h-0"
    >
      <LogFilters
        historyMode={historyMode}
        setHistoryMode={setHistoryMode}
        sitemapVisible={sitemapVisible}
        setSitemapVisible={setSitemapVisible}
      />
      <Card className="flex-1 flex flex-col overflow-hidden !py-0 rounded-none">
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          {shouldShowSitemap && (
            <>
              <ResizablePanel defaultSize={20} minSize={20}>
                <TreeView
                  nodes={nodes}
                  onSelectEndpoint={handleTreeSelect}
                  onSelectHost={handleHostSelect}
                  selectedId={null}
                  defaultExpandedIds={defaultExpandedIds}
                  isLoading={isLoading}
                  loadError={loadError}
                  errorTitle="Failed to load sitemap"
                  emptyTitle={hasActiveScope ? 'No matching sitemap entries' : 'No sitemap entries yet'}
                  emptyDescription={
                    hasActiveScope
                      ? 'No captured hosts match the active scope tab.'
                      : 'Captured HTTP hosts will appear here once traffic is available.'
                  }
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}
          <ResizablePanel defaultSize={shouldShowSitemap ? 80 : 100}>
            <div
              key={historyMode}
              className="h-full animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
            >
              {historyMode === 'http' ? <HttpHistoryView /> : <WebSocketHistoryView />}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Card>
    </TabbedPageLayout>
  );
}
