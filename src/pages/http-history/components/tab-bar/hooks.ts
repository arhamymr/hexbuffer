import { useTargetStore } from '@/stores/target';
import type { Target } from '@/types';

export interface Tab {
  id: string;
  targetId: string;
  targetName: string;
}

export function useTabBar() {
  const { removeTarget, updateTarget, targets }  = useTargetStore();

  const activeTabId = targets.find(t => t.tabActive)?.id ?? "all-scope";

  const setActiveTabId = (tabId: string) => {
    targets.forEach(t => {
      updateTarget(t.id, { tabActive: t.id === tabId });
    });
    if (tabId === "all-scope") {
      targets.forEach(t => updateTarget(t.id, { tabActive: false }));
    }
  };

  const activeTab = activeTabId === "all-scope"
    ? null
    : targets.find(t => t.id === activeTabId) ?? null;

  const removeTab = (tabId: string) => {
    removeTarget(tabId)
  };

  return {
    tabs: targets,
    activeTabId,
    setActiveTabId,
    activeTab,
    removeTab,
  };
}