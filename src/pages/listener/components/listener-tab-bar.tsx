import { PageTabBar } from '@/components/tabs-layout/tab-bar';
import { LISTENER_SUB_TABS } from '../constants';
import type { ListenerSubTab } from '../types';

interface ListenerTabBarProps {
  activeSubTab: ListenerSubTab;
  isPolling: boolean;
  onTabChange: (tab: ListenerSubTab) => void;
}

export function ListenerTabBar({
  activeSubTab,
  isPolling,
  onTabChange,
}: ListenerTabBarProps) {
  const tabs = LISTENER_SUB_TABS.map((tab) => ({
    id: tab.id,
    name: tab.label,
    closable: false,
  }));

  const handleTabChange = (tabId: string) => {
    if (LISTENER_SUB_TABS.some((tab) => tab.id === tabId)) {
      onTabChange(tabId as ListenerSubTab);
    }
  };

  return (
    <div className="relative shrink-0 border-b-2 border-green-500">
      <PageTabBar
        tabs={tabs}
        activeTabId={activeSubTab}
        onTabChange={handleTabChange}
      />
      {isPolling && (
        <span className="absolute right-3 top-3 animate-pulse text-[10px] text-muted-foreground">
          Polling...
        </span>
      )}
    </div>
  );
}
