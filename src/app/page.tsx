'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/stores/appStore';
import { useTrafficStore } from '@/stores/trafficStore';
import { useProxyStore } from '@/stores/proxyStore';
import { TabBar } from '@/components/tab-bar';
import { TargetSelectorDialog } from '@/components/target-selector-dialog';
import { ProxyTabContent } from '@/components/proxy/ProxyTabContent';
import { Card, CardContent } from '@/components/ui/card';
import type { FilterMode } from '@/stores/proxyStore';

export default function HomePage() {
  const pathname = usePathname();

  const targets = useAppStore((s) => s.targets);
  const routeTabs = useAppStore((s) => s.routeTabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const fetchTargets = useAppStore((s) => s.fetchTargets);
  const addTab = useAppStore((s) => s.addTab);

  const filterMode = useProxyStore((s) => s.filterMode);
  const setFilterMode = useProxyStore((s) => s.setFilterMode);
  const clearCalls = useTrafficStore((s) => s.clearCalls);

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

  return (
    <div className="h-full flex flex-col border-b">
      <div className="flex items-center gap-2 mb-2">
        <TabBar route={pathname} />
        <TargetSelectorDialog
          existingTargets={targets}
          onTargetSelected={handleAddTab}
          onTargetsUpdated={fetchTargets}
        />
      </div>

      {tabs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p className="mb-2">No target selected</p>
              <p className="text-sm mb-4">Create or select a target to start capturing API calls</p>
              <TargetSelectorDialog
                existingTargets={targets}
                onTargetSelected={(target) => {
                  handleAddTab(target);
                }}
                onTargetsUpdated={fetchTargets}
              />
            </div>
          </CardContent>
        </Card>
      ) : activeTarget ? (
        <ProxyTabContent
          key={activeTab?.id}
          target={activeTarget}
          targets={targets}
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          clearLogs={clearCalls}
          onTargetsUpdated={fetchTargets}
        />
      ) : null}
    </div>
  );
}