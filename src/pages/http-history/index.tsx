"use client";

import { Card } from "@/components/ui/card";
import { TrafficTable } from "./components/log-table/calls-columns";
import { LogFilters } from "./components/log-table/log-filters";
import { LogEntryBurpView } from "./components/log-table/log-entry-view";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { TabBar } from "@/pages/http-history/components/tab-bar";
import { TargetSelectorDialog } from "./components/target-selector";
import { useHttpHistoryStore } from "@/stores/http-history";
import { TreeView } from "./components/tree-view";
import { buildSiteMapTree } from "./utils";
import { useState } from "react";
import { useTabBar } from "./components/tab-bar/hooks";

export function HttpHistoryPage() {
  const [sitemapVisible, setSitemapVisible] = useState(true);
  const setSelectedCallId = useHttpHistoryStore((state) => state.setSelectedCallId);
  const calls = useHttpHistoryStore((state) => state.calls);
  const treeData = buildSiteMapTree(calls);
  const { activeTab } = useTabBar();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2 border-b border-green-500 sticky top-0 z-20 bg-background pt-2">
        <TabBar />
        <TargetSelectorDialog />
      </div>
      <LogFilters sitemapVisible={sitemapVisible} setSitemapVisible={setSitemapVisible} />
      <Card className="flex-1 flex flex-col overflow-hidden mt-3 !py-0">
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          {sitemapVisible && (
            <>
              <ResizablePanel defaultSize={20} minSize={20}>
                <TreeView
                  data={treeData}
                  onSelectEndpoint={(node) => {
                    setSelectedCallId(node.id);
                  }}
                  selectedId={null}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}
          <ResizablePanel defaultSize={sitemapVisible ? 80 : 100}>
              <ResizablePanelGroup orientation="vertical" className="flex-1">
                <ResizablePanel defaultSize={60}>
                  <TrafficTable targetScope={activeTab?.scope} />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40}>
                  <LogEntryBurpView />
                </ResizablePanel>
              </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Card>
    </div>
  );
}