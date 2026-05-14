"use client";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useHttpHistoryStore, Tab } from "@/stores/http-history";
import { TabBar } from "@/components/tab-bar";
import { TargetSelectorDialog } from "@/components/target-selector-dialog";
import { Card } from "@/components/ui/card";
import { TrafficTable } from "@/components/log-table/calls-columns";
import { LogFilters } from "@/components/log-table/log-filters";
import { LogEntryBurpView } from "@/components/log-table/LogEntryBurpView";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useHttpHistory, useLogFilter, useFilteredCalls } from "./hooks";

export function HttpHistoryPage() {
  const location = useLocation();
  const pathname = location.pathname;

  const targets = useHttpHistoryStore((s) => s.targets);
  const routeTabs = useHttpHistoryStore((s) => s.routeTabs);
  const activeTabId = useHttpHistoryStore((s) => s.activeTabId);
  const fetchTargets = useHttpHistoryStore((s) => s.fetchTargets);
  const addTab = useHttpHistoryStore((s) => s.addTab);

  const { calls, clearCalls } = useHttpHistory();
  const { filter, setFilter, toggleMethod, toggleStatus, clearFilters } = useLogFilter();
  const filteredLogs = useFilteredCalls(calls, filter);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tabs = routeTabs[pathname] || [];
  const activeTab = (tabs.length > 0 && activeTabId[pathname])
    ? tabs.find(t => t.id === activeTabId[pathname]) || tabs[0]
    : tabs[0] || null;

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const activeTarget = targets.find(t => t.id === activeTab?.targetId) || null;

  const handleAddTab = (target: typeof activeTarget) => {
    if (target) {
      addTab(pathname, target);
    }
  };

  const selectedCall = selectedId ? calls.find(c => c.id === selectedId) || null : null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2 border-b border-green-500 sticky top-9 z-20 bg-background pt-2">
        <TabBar route={pathname} />
        <TargetSelectorDialog
          existingTargets={targets}
          onTargetSelected={handleAddTab}
          onTargetsUpdated={fetchTargets}
        />
      </div>
      <LogFilters
        filter={filter}
        onFilterChange={setFilter}
        onClearFilters={clearFilters}
        filteredLogs={filteredLogs}
        calls={calls}
        clearCalls={clearCalls}
        toggleMethod={toggleMethod}
        toggleStatus={toggleStatus}
      />
      <Card className="flex-1 flex flex-col overflow-hidden mt-3 !py-1">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {calls.length === 0 ? 'No traffic captured yet' : 'No matches found'}
            </div>
          ) : (
            <ResizablePanelGroup orientation="horizontal" className="flex-1">
              <ResizablePanel defaultSize={60}>
                <TrafficTable calls={[...filteredLogs].reverse()} onSelect={setSelectedId} />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40}>
                {selectedCall ? (
                  <LogEntryBurpView call={selectedCall} />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    Select a request to view details
                  </div>
                )}
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </Card>

    </div>
  );
}