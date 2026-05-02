import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { RepeaterTab, HttpResponse } from '../types';

export function useRepeaterRequest(
  tabs: RepeaterTab[],
  activeTabId: string,
  updateTab: (tabId: string, updates: Partial<RepeaterTab>) => void
) {
  const sendRequest = useCallback(async () => {
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    const request = activeTab.request;
    if (!request.url) return;

    updateTab(activeTab.id, {
      isLoading: true,
      history: [...activeTab.history, request].slice(-200),
      historyIndex: activeTab.history.length,
    });

    try {
      const response = await invoke<HttpResponse>('send_http_request', { request });
      updateTab(activeTab.id, {
        response,
        isLoading: false,
      });
    } catch (error) {
      updateTab(activeTab.id, {
        response: {
          status: 0,
          status_text: 'Error',
          headers: {},
          body: String(error),
          time_ms: 0,
          final_url: request.url,
        },
        isLoading: false,
      });
    }
  }, [tabs, activeTabId, updateTab]);

  return { sendRequest };
}