import * as React from 'react';
import { useRepeaterStore } from '@/stores/repeater';
import { sendRepeaterRequest } from '../api';
import {
  type HttpMethod,
  type RepeaterTab,
} from '../types';

export function useRepeaterPage() {
  const { tabs, activeTabId, setActiveTabId, updateTab, closeTab } = useRepeaterStore();

  const activeTab = React.useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null,
    [activeTabId, tabs]
  );

  const updateActiveTab = React.useCallback((updater: (tab: RepeaterTab) => RepeaterTab) => {
    if (!activeTabId) {
      return;
    }

    updateTab(activeTabId, updater);
  }, [activeTabId, updateTab]);
  const updateMethod = React.useCallback((method: string) => {
    updateActiveTab((tab) => ({
      ...tab,
      request: {
        ...tab.request,
        method: method as HttpMethod,
      },
    }));
  }, [updateActiveTab]);

  const updateUrl = React.useCallback((url: string) => {
    updateActiveTab((tab) => ({
      ...tab,
      request: {
        ...tab.request,
        url,
      },
    }));
  }, [updateActiveTab]);

  const updateHeaders = React.useCallback((headers: string) => {
    updateActiveTab((tab) => ({
      ...tab,
      request: {
        ...tab.request,
        headers,
      },
    }));
  }, [updateActiveTab]);

  const updateBody = React.useCallback((body: string) => {
    updateActiveTab((tab) => ({
      ...tab,
      request: {
        ...tab.request,
        body,
      },
    }));
  }, [updateActiveTab]);

  const sendRequest = React.useCallback(async () => {
    if (!activeTab) {
      return;
    }

    updateActiveTab((tab) => ({
      ...tab,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await sendRepeaterRequest(activeTab.request);
      updateTab(activeTab.id, (tab) => ({
        ...tab,
        isLoading: false,
        response,
      }));
    } catch (error) {
      updateTab(activeTab.id, (tab) => ({
        ...tab,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to send request.',
      }));
    }
  }, [activeTab, updateActiveTab, updateTab]);

  return {
    tabs: tabs.map((tab) => ({ id: tab.id, name: tab.name })),
    activeTabId,
    setActiveTabId,
    closeTab,
    activeTab,
    updateMethod,
    updateUrl,
    updateHeaders,
    updateBody,
    sendRequest,
  };
}
