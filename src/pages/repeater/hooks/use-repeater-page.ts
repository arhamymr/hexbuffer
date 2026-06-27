import * as React from 'react';
import { useRepeaterStore } from '@/stores/repeater';
import { useShallow } from 'zustand/react/shallow';
import { parseRawHttpRequest, buildRawHttpRequest } from '@/lib/http-message';
import { sendRepeaterRequest } from '../api';
import { sendCraftRequest as triggerSendCraftRequest } from '@/triggers/repeater/craft';
import { type ParsedRepeaterRequest, type RepeaterTab } from '../types';

export function useRepeaterPage() {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    updateTab,
    renameTab,
    closeTab,
    closeTabsToLeft,
    closeTabsToRight,
  } = useRepeaterStore(
    useShallow((s) => ({
      tabs: s.tabs,
      activeTabId: s.activeTabId,
      setActiveTabId: s.setActiveTabId,
      updateTab: s.updateTab,
      renameTab: s.renameTab,
      closeTab: s.closeTab,
      closeTabsToLeft: s.closeTabsToLeft,
      closeTabsToRight: s.closeTabsToRight,
      addEmptyHttpTab: s.addEmptyHttpTab,
    }))
  );

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

  // ── Craft Mode: Send Request (delegates to trigger) ──

  const sendCraftRequest = React.useCallback(async () => {
    await triggerSendCraftRequest();
  }, []);

  // ── Load endpoint into repeater tab ──

  const loadEndpointIntoActiveTab = React.useCallback(
    (endpoint: { method: string; url: string; headers?: Record<string, string>; body?: string }) => {
      if (!activeTabId) return;
      const raw = buildRawHttpRequest({
        method: endpoint.method,
        url: endpoint.url,
        headers: endpoint.headers || {},
        body: endpoint.body || '',
      });
      updateActiveTab((tab) => ({
        ...tab,
        request: {
          raw,
          url: endpoint.url,
        },
      }));
    },
    [activeTabId, updateActiveTab]
  );

  return {
    tabs: tabs.map((tab) => ({ id: tab.id, name: tab.name })),
    activeTabId,
    setActiveTabId,
    renameTab,
    closeTab,
    closeTabsToLeft,
    closeTabsToRight,
    activeTab,
    addEmptyHttpTab,
    updateTab: updateActiveTab,
    updateUrl,
    updateRawRequest,
    sendRequest,
    // Craft mode
    sendCraftRequest,
    loadEndpointIntoActiveTab,
  };
}
