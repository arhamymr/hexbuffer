import * as React from 'react';
import { useTabsLayoutStore } from '@/stores/tabs-layout';

interface TabDefinition {
  id: string;
}

function getTabStateScope<T extends TabDefinition>(tabs: T[]) {
  return tabs.map((tab) => tab.id).join(':');
}

export function useTabState<T extends TabDefinition>(tabs: T[], scope = getTabStateScope(tabs)) {
  const storedActiveTabId = useTabsLayoutStore((state) => state.activeTabIds[scope]);
  const setStoredActiveTabId = useTabsLayoutStore((state) => state.setActiveTabId);
  const fallbackTabId = tabs[0]?.id ?? '';
  const activeTabId = tabs.some((tab) => tab.id === storedActiveTabId)
    ? storedActiveTabId
    : fallbackTabId;

  React.useEffect(() => {
    if (activeTabId && activeTabId !== storedActiveTabId) {
      setStoredActiveTabId(scope, activeTabId);
    }
  }, [activeTabId, scope, setStoredActiveTabId, storedActiveTabId]);

  const setActiveTabId = React.useCallback(
    (id: string) => {
      setStoredActiveTabId(scope, id);
    },
    [scope, setStoredActiveTabId]
  );

  return {
    activeTabId,
    setActiveTabId,
  };
}
