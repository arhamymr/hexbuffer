"use client";

import { Card } from "@/components/ui/card";
import { TrafficTable } from "./components/log-table/calls-columns";
import { LogFilters } from "./components/log-table/log-filters";
import { LogEntryBurpView } from "./components/log-table/log-entry-view";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { TabBar } from "@/pages/http-history/components/tab-bar";
import { TargetSelectorDialog } from "./components/target-selector";
import { useFilteredCalls } from "./components/log-table/store";

export function HttpHistoryPage() {
  const filteredLogs = useFilteredCalls();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2 border-b border-green-500 sticky top-0 z-20 bg-background pt-2">
        <TabBar />
        <TargetSelectorDialog />
      </div>
      <LogFilters />
      <Card className="flex-1 flex flex-col overflow-hidden mt-3 !py-1">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No traffic captured yet
          </div>
        ) : (
          <ResizablePanelGroup orientation="horizontal" className="flex-1">
            <ResizablePanel defaultSize={60}>
              <TrafficTable />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={40}>
              <LogEntryBurpView />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </Card>
    </div>
  );
}