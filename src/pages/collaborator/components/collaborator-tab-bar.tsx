import { PageTabBar } from '@/components/tabs-layout/tab-bar';
import { COLLABORATOR_SUB_TABS } from '../constants';
import type { CollaboratorSubTab } from '../types';

interface CollaboratorTabBarProps {
  activeSubTab: CollaboratorSubTab;
  isPolling: boolean;
  onTabChange: (tab: CollaboratorSubTab) => void;
}

export function CollaboratorTabBar({
  activeSubTab,
  isPolling,
  onTabChange,
}: CollaboratorTabBarProps) {
  const tabs = COLLABORATOR_SUB_TABS.map((tab) => ({
    id: tab.id,
    name: tab.label,
    closable: false,
  }));

  const handleTabChange = (tabId: string) => {
    if (COLLABORATOR_SUB_TABS.some((tab) => tab.id === tabId)) {
      onTabChange(tabId as CollaboratorSubTab);
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
