import * as React from 'react';
import { useTabState } from '@/components/tabs-layout/use-tab-state';
import type { PageTabItem } from '@/components/tabs-layout/types';
import { useDocumentsStore } from '@/stores/documents';
import { useTargetStore } from '@/stores/target';
import { toast } from 'sonner';
import type { TreeNodeData } from '../components/tree-view';
import { useHistoryQuery } from './use-history-query';

export type HistoryMode = 'http' | 'websocket';
const ALL_HISTORY_TAB_ID = 'all-scope';

export function useHttpHistoryPage() {
  const [sitemapVisible, setSitemapVisible] = React.useState(false);
  const [historyMode, setHistoryMode] = React.useState<HistoryMode>('http');
  const targets = useTargetStore((state) => state.targets);
  const removeActiveTab = useTargetStore((state) => state.removeActiveTab);
  const { setActiveScope, setSelectedCallId, setPathFilter } = useHistoryQuery();
  const activeTargets = React.useMemo(
    () => targets.filter((target) => target.tabActive),
    [targets]
  );
  const tabs = React.useMemo<PageTabItem[]>(
    () => [
      { id: ALL_HISTORY_TAB_ID, name: 'All History', closable: false },
      ...activeTargets.map((target) => ({
        id: target.id,
        name: target.name,
      })),
    ],
    [activeTargets]
  );
  const { activeTabId, setActiveTabId } = useTabState(tabs, 'http-history-target-tabs');
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

  const shouldShowSitemap = historyMode === 'http' && sitemapVisible;

  const handleTreeSelect = React.useCallback((node: TreeNodeData) => {
    if (node.fullPath) {
      setPathFilter(node.fullPath);
    }
    setSelectedCallId(null);
  }, [setPathFilter, setSelectedCallId]);

  const sendScopeToDocuments = React.useCallback((targetId: string) => {
    const target = activeTargets.find((activeTarget) => activeTarget.id === targetId);

    if (!target) {
      toast.error('Target scope is unavailable');
      return;
    }

    if (target.scope.length === 0) {
      toast.error('Target has no scope patterns');
      return;
    }

    const documentsStore = useDocumentsStore.getState();
    const scopeBlock = [`## ${target.name}`, ...target.scope].join('\n');

    documentsStore.updateDocument(documentsStore.activeDocumentId, (document) => ({
      ...document,
      sections: {
        ...document.sections,
        scope: document.sections.scope.trim()
          ? `${document.sections.scope.trimEnd()}\n\n${scopeBlock}`
          : scopeBlock,
      },
      updatedAt: new Date().toISOString(),
    }));
    toast.success('Sent scope to active document');
  }, [activeTargets]);

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    removeTab,
    historyMode,
    setHistoryMode,
    sitemapVisible,
    setSitemapVisible,
    shouldShowSitemap,
    handleTreeSelect,
    sendScopeToDocuments,
  };
}
