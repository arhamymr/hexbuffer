import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useRepeaterStore } from '@/stores/repeaterStore';
import type { RepeaterResponse } from '../types';
import { parseHeaders } from '../types';
import { isMockMode } from '@/lib/mock-invoke';

export function useSendRequest() {
  const { setLoading, setResponse, setError, getActiveTab } = useRepeaterStore();

  const sendRequest = useCallback(async (tabId: string) => {
    const tab = useRepeaterStore.getState().tabs.find((t) => t.id === tabId);
    if (!tab) return;

    if (!tab.request.url.trim()) {
      setError(tabId, 'URL is required');
      return;
    }

    setLoading(tabId, true);
    setResponse(tabId, null);

    try {
      const headers = parseHeaders(tab.request.headers);

      let response: RepeaterResponse;

      if (isMockMode()) {
        response = await invoke<RepeaterResponse>('send_http_request', {
          request: {
            method: tab.request.method,
            url: tab.request.url,
            headers,
            body: tab.request.body,
          },
        });
      } else {
        response = await invoke<RepeaterResponse>('send_http_request', {
          request: {
            method: tab.request.method,
            url: tab.request.url,
            headers,
            body: tab.request.body,
          },
        });
      }

      setResponse(tabId, response);
    } catch (error) {
      setError(tabId, error instanceof Error ? error.message : String(error));
    }
  }, [setLoading, setResponse, setError]);

  return { sendRequest };
}