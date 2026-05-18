'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogFilters } from "./components/log-table/log-filters";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { TabBar } from "@/pages/http-history/components/tab-bar";
import { TargetSelectorDialog } from "./components/target-selector";
import { TreeView } from "./components/tree-view";
import { HttpHistoryView } from "./components/http-history-view";
import { WebSocketHistoryView } from "./components/websocket-history-view";
import { useHttpHistoryPage } from "./hooks/use-http-history-page";

export function HttpHistoryPage() {
  const {
    historyMode,
    setHistoryMode,
    sitemapVisible,
    setSitemapVisible,
    shouldShowSitemap,
    handleTreeSelect,
  } = useHttpHistoryPage();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2 border-b border-green-500 sticky top-0 z-20 bg-background pt-2">
        <TabBar />
        <TargetSelectorDialog />
        <div className="ml-auto flex items-center gap-1 pb-2">
          <Button
            variant={historyMode === 'http' ? 'default' : 'outline'}
            size="xs"
            onClick={() => setHistoryMode('http')}
          >
            HTTP
          </Button>
          <Button
            variant={historyMode === 'websocket' ? 'default' : 'outline'}
            size="xs"
            onClick={() => setHistoryMode('websocket')}
          >
            WebSocket
          </Button>
        </div>
      </div>
      <LogFilters
        historyMode={historyMode}
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
    </div>
  );
}
