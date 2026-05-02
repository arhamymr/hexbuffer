import { useState, useCallback, useMemo } from 'react';
import { RepeaterTab, HttpRequest, createNewTab, createTabWithRequest, HttpRequestTemplate, parseRawRequest } from '../types';

export function useRepeaterTabs(initialRequest?: HttpRequestTemplate | null) {
  const [tabs, setTabs] = useState<RepeaterTab[]>(() =>
    initialRequest ? [createTabWithRequest(initialRequest)] : [createNewTab()]
  );
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);

  const activeTab = useMemo(() =>
    tabs.find((t) => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  const addNewTab = useCallback(() => {
    const newTab = createNewTab();
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prevTabs) => {
      const tabIndex = prevTabs.findIndex((t) => t.id === tabId);
      const newTabs = prevTabs.filter((t) => t.id !== tabId);
      if (newTabs.length === 0) {
        const newTab = createNewTab();
        setActiveTabId(newTab.id);
        return [newTab];
      }
      if (activeTabId === tabId) {
        const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      }
      return newTabs;
    });
  }, [activeTabId]);

  const updateTab = useCallback((tabId: string, updates: Partial<RepeaterTab>) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId ? { ...tab, ...updates } : tab
      )
    );
  }, []);

  const updateRequest = useCallback((tabId: string, request: Partial<HttpRequest>) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId
          ? { ...tab, request: { ...tab.request, ...request } }
          : tab
      )
    );
  }, []);

  const navigateHistory = useCallback((direction: number) => {
    setTabs((prevTabs) => {
      const activeTab = prevTabs.find((t) => t.id === activeTabId);
      if (!activeTab) return prevTabs;

      const newIndex = activeTab.historyIndex + direction;
      if (newIndex >= 0 && newIndex < activeTab.history.length) {
        const historicalRequest = activeTab.history[newIndex];
        return prevTabs.map((tab) =>
          tab.id === activeTabId
            ? { ...tab, request: historicalRequest, historyIndex: newIndex }
            : tab
        );
      }
      return prevTabs;
    });
  }, [activeTabId]);

  return {
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    addNewTab,
    closeTab,
    updateTab,
    updateRequest,
    navigateHistory,
  };
}