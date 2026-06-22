import * as React from 'react';
import { useInterceptStore } from '../state/intercept-store';

export function useInterceptPage() {
  const refresh = useInterceptStore((state) => state.refresh);
  const syncActiveScope = useInterceptStore((state) => state.syncActiveScope);
  const tabs = useInterceptStore((state) => state.tabs);
  const activeTabId = useInterceptStore((state) => state.activeTabId);
  const setActiveTabId = useInterceptStore((state) => state.setActiveTabId);
  const addTab = useInterceptStore((state) => state.addTab);
  const renameTab = useInterceptStore((state) => state.renameTab);
  const closeTab = useInterceptStore((state) => state.closeTab);
  const closeTabsToLeft = useInterceptStore((state) => state.closeTabsToLeft);
  const closeTabsToRight = useInterceptStore((state) => state.closeTabsToRight);

  React.useEffect(() => {
    void syncActiveScope();
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 1000);

    return () => window.clearInterval(intervalId);
  }, [refresh, syncActiveScope]);

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    addTab,
    renameTab,
    closeTab,
    closeTabsToLeft,
    closeTabsToRight,
  };
}

