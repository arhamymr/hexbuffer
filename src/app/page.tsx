'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAppState } from '@/app/context/AppContext';
import { useTabs } from '@/app/context/TabsContext';
import { AppLayout } from '@/components/app-sidebar';
import { DashboardContent } from '@/components/dashboard-content';
import { TabBar } from '@/components/tab-bar';
import { TargetSelectorDialog } from '@/components/target-selector-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

function DashboardPage() {
  const pathname = usePathname();
  const { targets, connections, calls, fetchTargets } = useAppState();
  const { getActiveTab, getRouteTabs, addTab } = useTabs();
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
      ) : (
        <DashboardContent
          selectedTarget={activeTarget}
          connections={connections}
          calls={calls}
          onScopeUpdated={fetchTargets}
        />
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <AppLayout>
      <DashboardPage />
    </AppLayout>
  );
}