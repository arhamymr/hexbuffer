import * as React from 'react';
import {
  createDefaultRepeaterTab,
  parseHeaders,
  type HttpMethod,
  type RepeaterResponse,
  type RepeaterTab,
} from '../types';

function buildMockResponse(tab: RepeaterTab): RepeaterResponse {
  return {
    status: 200,
    status_text: 'OK',
    headers: {
      'content-type': 'application/json',
      'x-apprecon-mode': 'mock',
    },
    body: JSON.stringify(
      {
        message: 'Repeater transport is not wired yet.',
        request: {
          method: tab.request.method,
          url: tab.request.url,
          headers: parseHeaders(tab.request.headers),
          body: tab.request.body,
        },
      },
      null,
      2
    ),
    time_ms: 0,
    final_url: tab.request.url,
  };
}

export function useRepeaterPage() {
  const [state, setState] = React.useState(() => {
    const initialTab = createDefaultRepeaterTab(1);

    return {
      tabs: [initialTab],
      activeTabId: initialTab.id,
    };
  });

  const { tabs, activeTabId } = state;
  const setActiveTabId = React.useCallback((id: string) => {
    setState((currentState) => ({ ...currentState, activeTabId: id }));
  }, []);

  const activeTab = React.useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null,
    [activeTabId, tabs]
  );

  const updateActiveTab = React.useCallback((updater: (tab: RepeaterTab) => RepeaterTab) => {
    setState((currentState) => ({
      ...currentState,
      tabs: currentState.tabs.map((tab) => (tab.id === activeTabId ? updater(tab) : tab)),
    }));
  }, [activeTabId]);

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

  const sendRequest = React.useCallback(() => {
    if (!activeTab) {
      return;
    }

    updateActiveTab((tab) => ({
      ...tab,
      isLoading: true,
      error: null,
    }));

    window.setTimeout(() => {
      setState((currentState) => ({
        ...currentState,
        tabs: currentState.tabs.map((tab) =>
          tab.id === activeTab.id
            ? {
                ...tab,
                isLoading: false,
                response: buildMockResponse(tab),
              }
            : tab
        ),
      }));
    }, 250);
  }, [activeTab, updateActiveTab]);

  return {
    tabs: tabs.map((tab) => ({ id: tab.id, name: tab.name })),
    activeTabId,
    setActiveTabId,
    activeTab,
    updateMethod,
    updateUrl,
    updateHeaders,
    updateBody,
    sendRequest,
  };
}
