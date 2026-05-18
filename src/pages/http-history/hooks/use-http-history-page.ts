import * as React from 'react';
import { useTabBar } from '../components/tab-bar/hooks';
import type { TreeNodeData } from '../components/tree-view';
import { useHistoryQuery } from './use-history-query';

export type HistoryMode = 'http' | 'websocket';

export function useHttpHistoryPage() {
  const [sitemapVisible, setSitemapVisible] = React.useState(true);
  const [historyMode, setHistoryMode] = React.useState<HistoryMode>('http');
  const { activeTab } = useTabBar();
  const { setActiveScope, setSelectedCallId, setPathFilter } = useHistoryQuery();

  React.useEffect(() => {
    setActiveScope(activeTab?.scope ?? null);
  }, [activeTab?.scope, setActiveScope]);

  const shouldShowSitemap = historyMode === 'http' && sitemapVisible;

  const handleTreeSelect = React.useCallback((node: TreeNodeData) => {
    if (node.fullPath) {
      setPathFilter(node.fullPath);
    }
    setSelectedCallId(null);
  }, [setPathFilter, setSelectedCallId]);

  return {
    historyMode,
    setHistoryMode,
    sitemapVisible,
    setSitemapVisible,
    shouldShowSitemap,
    handleTreeSelect,
  };
}
