import { PageTabBar } from '@/components/tabs-layout/tab-bar';
import { MOCK_FORGE_SUB_TABS } from '../constants';
import type { MockForgeSubTab } from '../types';

interface MockForgeTabBarProps {
  activeSubTab: MockForgeSubTab;
  onTabChange: (tab: MockForgeSubTab) => void;
}

export function MockForgeTabBar({ activeSubTab, onTabChange }: MockForgeTabBarProps) {
  const tabs = MOCK_FORGE_SUB_TABS.map((t) => ({ id: t.id, name: t.label, closable: false }));

  const handleTabChange = (tabId: string) => {
    if (MOCK_FORGE_SUB_TABS.some((t) => t.id === tabId)) {
      onTabChange(tabId as MockForgeSubTab);
    }
  };

  return (
    <div className="shrink-0 border-b-2 border-orange-500">
      <PageTabBar tabs={tabs} activeTabId={activeSubTab} onTabChange={handleTabChange} />
    </div>
  );
}
