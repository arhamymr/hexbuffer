'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import type { Target } from '@/types';

export interface Tab {
  id: string;
  targetId: string;
  targetName: string;
}

interface TabsContextValue {
  getRouteTabs: (route: string) => Tab[];
  getActiveTab: (route: string) => Tab | null;
  addTab: (route: string, target: Target) => void;
  removeTab: (route: string, tabId: string) => void;
  setActiveTab: (route: string, tabId: string) => void;
  clearRouteTabs: (route: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

export function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within TabsProvider');
  }
  return context;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function TabsProvider({ children }: { children: ReactNode }) {
  const [routeTabs, setRouteTabs] = useState<Record<string, Tab[]>>({});
  const [activeTabId, setActiveTabId] = useState<Record<string, string>>({});

  const getRouteTabs = useCallback((route: string): Tab[] => {
    return routeTabs[route] || [];
  }, [routeTabs]);

  const getActiveTab = useCallback((route: string): Tab | null => {
    const tabs = routeTabs[route] || [];
    const activeId = activeTabId[route];
    if (!activeId) return tabs[0] || null;
    return tabs.find(t => t.id === activeId) || tabs[0] || null;
  }, [routeTabs, activeTabId]);

  const addTab = useCallback((route: string, target: Target) => {
    const newTab: Tab = {
      id: generateId(),
      targetId: target.id,
      targetName: target.name,
    };

    setRouteTabs(prev => {
      const existing = prev[route] || [];
      const alreadyExists = existing.some(t => t.targetId === target.id);
      if (alreadyExists) {
        setActiveTabId(prevActive => ({ ...prevActive, [route]: newTab.id }));
        return prev;
      }
      return {
        ...prev,
        [route]: [...existing, newTab],
      };
    });

    setActiveTabId(prev => ({ ...prev, [route]: newTab.id }));
  }, []);

  const removeTab = useCallback((route: string, tabId: string) => {
    setRouteTabs(prev => {
      const tabs = prev[route] || [];
      const newTabs = tabs.filter(t => t.id !== tabId);
      if (newTabs.length === 0) {
        const newState = { ...prev };
        delete newState[route];
        return newState;
      }
      return { ...prev, [route]: newTabs };
    });

    setActiveTabId(prev => {
      const tabs = routeTabs[route] || [];
      const currentActive = prev[route];

      if (currentActive === tabId) {
        const remaining = tabs.filter(t => t.id !== tabId);
        if (remaining.length === 0) {
          const newState = { ...prev };
          delete newState[route];
          return newState;
        }
        const removedIndex = tabs.findIndex(t => t.id === tabId);
        const newActiveIndex = removedIndex === 0 ? 0 : removedIndex - 1;
        return { ...prev, [route]: remaining[newActiveIndex].id };
      }

      return prev;
    });
  }, [routeTabs]);

  const setActiveTab = useCallback((route: string, tabId: string) => {
    setActiveTabId(prev => ({ ...prev, [route]: tabId }));
  }, []);

  const clearRouteTabs = useCallback((route: string) => {
    setRouteTabs(prev => {
      const newState = { ...prev };
      delete newState[route];
      return newState;
    });
    setActiveTabId(prev => {
      const newState = { ...prev };
      delete newState[route];
      return newState;
    });
  }, []);

  const value = useMemo(() => ({
    getRouteTabs,
    getActiveTab,
    addTab,
    removeTab,
    setActiveTab,
    clearRouteTabs,
  }), [getRouteTabs, getActiveTab, addTab, removeTab, setActiveTab, clearRouteTabs]);

  return (
    <TabsContext.Provider value={value}>
      {children}
    </TabsContext.Provider>
  );
}