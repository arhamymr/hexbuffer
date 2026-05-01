'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAppState } from '@/app/context/AppContext';
import { useTabs } from '@/app/context/TabsContext';
import { AppLayout } from '@/components/app-sidebar';
import { RepeaterPage } from '@/components/repeater';
import { TabBar } from '@/components/tab-bar';
import { TargetSelectorDialog } from '@/components/target-selector-dialog';
import { Card, CardContent } from '@/components/ui/card';

function RepeaterPageWrapper() {
  const pathname = usePathname();
  const { targets, fetchTargets } = useAppState();
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
              <p className="text-sm mb-4">Create or select a target to use Repeater</p>
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
        <RepeaterPage selectedTarget={activeTarget} />
      )}
    </>
  );
}

export default function RepeaterPageRoute() {
  return (
    <AppLayout>
      <RepeaterPageWrapper />
    </AppLayout>
  );
}