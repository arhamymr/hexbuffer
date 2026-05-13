"use client";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppStore } from "@/stores/app";
import { useProxyStore } from "@/stores/proxyStore";
import { TabBar } from "@/components/tab-bar";
import { TargetSelectorDialog } from "@/components/target-selector-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { TrafficTable } from "@/components/log-table/calls-columns";
import { LogFilters } from "@/components/log-table/log-filters";
import { LogDetailDrawer } from "@/components/log-table/log-detail-drawer";
import type { FilterState } from "@/components/log-table/types";
import { STATUS_FILTERS } from "@/components/log-table/utils";
import { DEFAULT_FILTER_STATE } from "@/components/log-table/types";

export function HttpHistoryPage() {
  const location = useLocation();
  const pathname = location.pathname;

  const targets = useAppStore((s) => s.targets);
  const routeTabs = useAppStore((s) => s.routeTabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const fetchTargets = useAppStore((s) => s.fetchTargets);
  const addTab = useAppStore((s) => s.addTab);

  const calls = useProxyStore((s) => s.calls);
  const clearCalls = useProxyStore((s) => s.clearCalls);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE);

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

  const filteredLogs = calls.filter((log) => {
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      const matchesSearch =
        log.url?.toLowerCase().includes(searchLower) ||
        log.host?.toLowerCase().includes(searchLower) ||
        log.method?.toLowerCase().includes(searchLower) ||
        log.request_body?.toLowerCase().includes(searchLower) ||
        log.response_body?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    if (filter.methods.size > 0 && log.method) {
      if (!filter.methods.has(log.method.toUpperCase())) return false;
    }

    if (filter.statusCodes.size > 0 && log.response_status) {
      let matchesStatus = false;
      for (const code of filter.statusCodes) {
        const range = STATUS_FILTERS.find((f) => f.label === code);
        if (range && log.response_status >= range.min && log.response_status <= range.max) {
          matchesStatus = true;
          break;
        }
      }
      if (!matchesStatus) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setFilter(DEFAULT_FILTER_STATE);
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
      />
      <Card className="flex-1 flex flex-col overflow-hidden mt-3 !py-1">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {calls.length === 0 ? 'No traffic captured yet' : 'No matches found'}
            </div>
          ) : (
            <TrafficTable
              calls={[...filteredLogs].reverse()}
              onSelect={setSelectedId}
            />
          )}
      </Card>
      <LogDetailDrawer
        call={selectedCall}
        onClose={() => setSelectedId(null)}
      />

    </div>
  );
}