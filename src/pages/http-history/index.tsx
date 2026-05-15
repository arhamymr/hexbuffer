"use client";

import { Card } from "@/components/ui/card";
import { TrafficTable } from "./components/log-table/calls-columns";
import { LogFilters } from "./components/log-table/log-filters";
import { LogEntryBurpView } from "./components/log-table/log-entry-view";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { TabBar } from "@/pages/http-history/components/tab-bar";
import { TargetSelectorDialog } from "./components/target-selector";
import { useLogTableStore } from "./components/log-table/store";
import { TreeView } from "./components/TreeView";
import { MOCK_TREE_DATA } from "./mock";
import { useState } from "react";

export function HttpHistoryPage() {
  const [sitemapVisible, setSitemapVisible] = useState(true);
  const setSelectedCallId = useLogTableStore((state) => state.setSelectedCallId);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2 border-b border-green-500 sticky top-0 z-20 bg-background pt-2">
        <TabBar />
        <TargetSelectorDialog />
      </div>
      <LogFilters sitemapVisible={sitemapVisible} setSitemapVisible={setSitemapVisible} />
      <Card className="flex-1 flex flex-col overflow-hidden mt-3 !py-1">
        <ResizablePanelGroup orientation="horizontal" className="flex-1">
          {sitemapVisible && (
            <>
              <ResizablePanel defaultSize={20} minSize={20}>
                <TreeView
                  data={MOCK_TREE_DATA}
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
                  <TrafficTable />
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