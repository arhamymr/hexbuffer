'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/stores/appStore';
import { AppLayout } from '@/components/app-sidebar';
import { TabBar } from '@/components/tab-bar';
import { TargetSelectorDialog } from '@/components/target-selector-dialog';
import { Card, CardContent } from '@/components/ui/card';

function HistoryPageWrapper() {
  const pathname = usePathname();
  const targets = useAppStore((s) => s.targets);
  const fetchTargets = useAppStore((s) => s.fetchTargets);
  const getActiveTab = useAppStore((s) => s.getActiveTab);
  const getRouteTabs = useAppStore((s) => s.getRouteTabs);
  const addTab = useAppStore((s) => s.addTab);
  const tabs = getRouteTabs(pathname);
  const activeTab = getActiveTab(pathname);

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
    <>
      <div className="flex items-center gap-2 mb-4">
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
              <p className="text-sm mb-4">Create or select a target to view history</p>
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
      ) : (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">History</h1>
          <p className="text-muted-foreground">Coming soon...</p>
        </div>
      )}
    </>
  );
}

export default function HistoryPage() {
  return (
    <AppLayout>
      <HistoryPageWrapper />
    </AppLayout>
  );
}