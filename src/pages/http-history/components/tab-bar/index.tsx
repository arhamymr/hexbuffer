'use client';

import { PageTabBar } from '@/components/tabs-layout/tab-bar';
import { useTabBar } from './hooks';

export function TabBar() {
  const { tabs, activeTabId, setActiveTabId, removeTab } = useTabBar();

  return (
    <div className="min-w-0 flex-1 pb-2">
      <PageTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        onTabClose={removeTab}
      />
    </div>
  );
}
