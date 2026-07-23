import * as React from 'react';
import { useTabState } from '@/components/tabs-layout/use-tab-state';
import type { PageTabItem } from '@/components/tabs-layout/types';
import { useTargetStore } from '@/stores/target';
import { useFloatingBarUiStore } from '@/stores/floating-bar-ui';
import { useWebSocketHistoryQueryStore } from '@/stores/history';
import { closeTargetSelector } from '@/triggers';
import { WebSocketHistoryView } from '../components/websocket-history-view';

const ALL_HISTORY_TAB_ID = 'all-scope';

export function useWebSocketHistoryPage() {
  const targets = useTargetStore((state) => state.targets);
  const removeActiveTab = useTargetStore((state) => state.removeActiveTab);
  const setActiveScope = useWebSocketHistoryQueryStore((state) => state.setActiveScope);

  const activeTargets = React.useMemo(
    () => targets.filter((target) => target.tabActive),
    [targets]
  );
  const tabs = React.useMemo<PageTabItem[]>(
    () => [
      { id: ALL_HISTORY_TAB_ID, name: 'All Connections', closable: false },
      ...activeTargets.map((target) => ({
        id: target.id,
        name: target.name,
      })),
    ],
    [activeTargets]
  );
  const { activeTabId, setActiveTabId } = useTabState(tabs, 'ws-history-target-tabs');
  const activeTab = activeTabId === ALL_HISTORY_TAB_ID
    ? null
    : activeTargets.find((target) => target.id === activeTabId);

  const removeTab = React.useCallback((targetId: string) => {
    if (targetId === ALL_HISTORY_TAB_ID) {
      return;
    }
    removeActiveTab(targetId);
  }, [removeActiveTab]);

  React.useEffect(() => {
    setActiveScope(activeTab?.scope ?? null);
  }, [activeTab?.scope, setActiveScope]);

  const isTargetSelectorOpen = useFloatingBarUiStore((s) => s.isTargetSelectorOpen);

  const websocketView = React.useMemo(() => (
    <WebSocketHistoryView />
  ), []);

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    removeTab,
    isTargetSelectorOpen,
    closeTargetSelector,
    websocketView,
  };
}
