import { useState, useEffect } from 'react';
import { useTargetStore } from '@/stores/target';

export interface Tab {
  id: string;
  targetId: string;
  targetName: string;
}

export function useTabBar() {
  const { targets, removeTarget }  = useTargetStore();
  const [activeTabId, setActiveTabId] = useState<string | null>("all-scope");

  const removeTab = (tabId: string) => {
    removeTarget(tabId)
  };
  
  return {
    tabs:targets,
    activeTabId,
    setActiveTabId,
    removeTab,
  };
}