import { useTargetStore } from '@/stores/target';
import type { PageTabItem } from '@/components/tabs-layout/tab-bar';

const ALL_HISTORY_TAB_ID = 'all-scope';

export interface Tab {
  id: string;
  targetId: string;
  targetName: string;
}

export function useTabBar() {
  const { removeTarget, updateTarget, targets }  = useTargetStore();

  const activeTabId = targets.find(t => t.tabActive)?.id ?? ALL_HISTORY_TAB_ID;
  const tabs: PageTabItem[] = [
    { id: ALL_HISTORY_TAB_ID, name: 'All History', closable: false },
    ...targets.map((target) => ({
      id: target.id,
      name: target.name,
    })),
  ];

  const setActiveTabId = (tabId: string) => {
    targets.forEach(t => {
      updateTarget(t.id, { tabActive: t.id === tabId });
    });
    if (tabId === ALL_HISTORY_TAB_ID) {
      targets.forEach(t => updateTarget(t.id, { tabActive: false }));
    }
  };

  const activeTab = activeTabId === ALL_HISTORY_TAB_ID
    ? null
    : targets.find(t => t.id === activeTabId) ?? null;

  const removeTab = (tabId: string) => {
    if (tabId === ALL_HISTORY_TAB_ID) {
      return;
    }

    removeTarget(tabId);
    setActiveTabId(ALL_HISTORY_TAB_ID);
  };

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    activeTab,
    removeTab,
  };
}
