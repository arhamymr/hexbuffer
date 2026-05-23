import * as React from 'react';
import { useRepeaterStore } from '@/stores/repeater';
import { parseRawHttpRequest } from '@/lib/http-message';
import { sendRepeaterRequest } from '../api';
import { type ParsedRepeaterRequest, type RepeaterTab } from '../types';

export function useRepeaterPage() {
  const { tabs, activeTabId, setActiveTabId, updateTab, renameTab, closeTab } = useRepeaterStore();

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
  const updateUrl = React.useCallback((url: string) => {
    updateActiveTab((tab) => ({
      ...tab,
      request: {
        ...tab.request,
        url,
      },
    }));
  }, [updateActiveTab]);

  const updateRawRequest = React.useCallback((raw: string) => {
    updateActiveTab((tab) => ({
      ...tab,
      request: {
        ...tab.request,
        raw,
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
      const parsedRequest = parseRawHttpRequest(activeTab.request.raw, {
        fallbackUrl: activeTab.request.url,
      }) as ParsedRepeaterRequest;
      const response = await sendRepeaterRequest(parsedRequest);
      updateTab(activeTab.id, (tab) => ({
        ...tab,
        isLoading: false,
        response,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
          ? error
          : 'Failed to send request.';

      updateTab(activeTab.id, (tab) => ({
        ...tab,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [activeTab, updateActiveTab, updateTab]);

  return {
    tabs: tabs.map((tab) => ({ id: tab.id, name: tab.name })),
    activeTabId,
    setActiveTabId,
    renameTab,
    closeTab,
    activeTab,
    updateUrl,
    updateRawRequest,
    sendRequest,
  };
}
