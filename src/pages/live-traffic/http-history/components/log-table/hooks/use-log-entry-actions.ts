import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type { ApiCall } from '@/types';
import { deleteHistoryLog, fetchHistoryDetail } from '../../../services/history-service';
import { createDefaultAttackConfig, findRequestPayloadPositions } from '@/pages/invoker/types';
import { useInvokerStore } from '@/stores/invoker';
import { useDocumentsStore } from '@/stores/documents';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import {
  useHttpHistoryQueryStore,
  usePinnedRequestsStore,
  useGroupsStore,
  useBlacklistStore,
  useHighlightStore,
} from '@/stores/history';
import { adaptProxyRecordToApiCall } from './use-history-table';
import { useRepeaterStore } from '@/stores/repeater';
import { buildHttpCurlCommand, buildRawHttpRequest } from '@/lib/http-message';
import { copyText } from '@/lib/clipboard';
import { useTargetStore } from '@/stores/target';
import { useNavStore } from '@/stores/nav';
import { useInterceptStore } from '@/pages/intercept/state/intercept-store';
import { invoke } from '@tauri-apps/api/core';
import { useMockForgeStore } from '@/stores/mock-forge';
import type { MockDomain, MockRoute } from '@/pages/mock-forge/types';
import { sendToCollection } from '@/triggers/repeater/send-to-collection';
import { cleanUrl } from '@/lib/utils';

function buildAutomationTargetUrl(request: ApiCall) {
  try {
    return new URL(request.url).origin;
  } catch {
    const host = request.host || request.url.replace(/^https?:\/\//i, '').split('/')[0];
    return host ? `https://${host}` : request.url;
  }
}

export function useLogEntryActions(call: ApiCall, onDelete?: (id: string) => void) {
  const triggerRefresh = useHttpHistoryQueryStore((state) => state.triggerRefresh);
  const togglePin = usePinnedRequestsStore((s) => s.togglePin);
  const isPinned = usePinnedRequestsStore((s) => s.isPinned);
  const pinned = isPinned(call.id);

  const groups = useGroupsStore((s) => s.groups);
  const groupRequestIds = useGroupsStore((s) => s.groupRequestIds);
  const addRequestToGroup = useGroupsStore((s) => s.addRequestToGroup);
  const removeRequestFromGroup = useGroupsStore((s) => s.removeRequestFromGroup);
  const removeRequestFromAllGroups = useGroupsStore((s) => s.removeRequestFromAllGroups);
  const createGroup = useGroupsStore((s) => s.createGroup);

  const requestGroupIds = useMemo(() => {
    return groups.filter((g) => groupRequestIds[g.id]?.includes(call.id)).map((g) => g.id);
  }, [groups, groupRequestIds, call.id]);

  const handleQuickAddToGroup = useCallback(() => {
    const name = `Group ${groups.length + 1}`;
    const existing = groups.find((g) => g.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      addRequestToGroup(existing.id, call);
    } else {
      const groupId = createGroup(name);
      if (groupId) addRequestToGroup(groupId, call);
    }
  }, [groups, createGroup, addRequestToGroup, call]);

  const handleTogglePin = useCallback(() => {
    togglePin(call);
  }, [call, togglePin]);

  const handleCopyCurlCommand = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      const curl = buildHttpCurlCommand({
        method: request.method,
        url: cleanUrl(request.url),
        headers: request.headers,
        body: request.request_body ?? '',
      });
      if (await copyText(curl)) toast.success('Copied as curl command (bash)');
      else toast.error('Failed to copy as curl command (bash)');
    } catch (error) {
      console.error('Failed to copy curl command:', error);
      toast.error('Failed to copy as curl command (bash)');
    }
  }, [call.id]);

  const handleCopyUrl = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      const cleaned = cleanUrl(request.url);
      if (await copyText(cleaned)) toast.success('Copied URL');
      else toast.error('Failed to copy URL');
    } catch {
      const cleaned = cleanUrl(call.url);
      if (await copyText(cleaned)) toast.success('Copied URL');
      else toast.error('Failed to copy URL');
    }
  }, [call.id, call.url]);

  const handleAddToScope = useCallback(() => {
    const target = useTargetStore.getState().addHostTarget(call.host);
    if (!target) {
      toast.error('Host is unavailable');
      return;
    }
    toast.success(`Added ${target.name} to targets`);
  }, [call.host]);

  const handleOpenInInvoker = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      const baseRequest = {
        method: request.method,
        url: cleanUrl(request.url),
        headers: request.headers,
        body: request.request_body || '',
        follow_redirects: true,
        max_hops: 10,
      };
      const config = {
        ...createDefaultAttackConfig(),
        name: `${request.method} ${request.path || request.url}`,
        base_request: baseRequest,
        positions: findRequestPayloadPositions(baseRequest),
      };
      useInvokerStore.getState().addAttackTab(config);
      useNavStore.getState().triggerNavBlink('/invoker');
      toast.success(`Sent ${request.method} ${request.path || request.url} to Invoker`);
    } catch (error) {
      console.error('Failed to open request in Invoker:', error);
      toast.error('Failed to open request in Invoker');
    }
  }, [call.id]);

  const handleOpenInRepeater = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      const cleanedUrl = cleanUrl(request.url);
      useRepeaterStore.getState().addRequestTab({
        raw: buildRawHttpRequest({
          method: request.method,
          url: cleanedUrl,
          headers: request.headers,
          body: request.request_body || '',
        }),
        url: cleanedUrl,
      });
      useNavStore.getState().triggerNavBlink('/repeater');
      toast.success(`Sent ${request.method} ${request.path || request.url} to Repeater`);
    } catch (error) {
      console.error('Failed to open request in Repeater:', error);
      toast.error('Failed to open request in Repeater');
    }
  }, [call.id]);

  const handleSendToCollection = useCallback(async (stashId: string) => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      await sendToCollection({
        stashId,
        stashName: '',
        endpointData: {
          name: `${request.method} ${request.path || request.url}`,
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: request.request_body || null,
        },
      });
    } catch (error) {
      console.error('Failed to send to collection:', error);
      toast.error('Failed to send to collection');
    }
  }, [call.id]);

  const handleSendToIntercept = useCallback(() => {
    const host = call.host?.trim();
    if (!host) {
      toast.error('Host is unavailable');
      return;
    }
    useInterceptStore.getState().addTabForHost(host);
    useNavStore.getState().triggerNavBlink('/intercept');
    toast.success(`Intercept tab created for ${host}`);
  }, [call.host]);

  const handleOpenInBrowserAutomation = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      const targetUrl = buildAutomationTargetUrl(request);
      useBrowserAutomationStore.getState().addAutomationTab(
        { targetUrl },
        request.host || targetUrl
      );
      useNavStore.getState().triggerNavBlink('/browser-automation');
      toast.success(`Sent ${request.host || targetUrl} to Browser Automation`);
    } catch (error) {
      console.error('Failed to open target in Browser Automation:', error);
      toast.error('Failed to open target in Browser Automation');
    }
  }, [call.id]);

  const handleSendToMockForge = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);

      const hostname = request.host;
      if (!hostname) {
        toast.error('Host is unavailable');
        return;
      }

      const domains = await invoke<MockDomain[]>('mock_forge_get_domains');
      let domain = domains.find((d) => d.hostname === hostname);

      if (!domain) {
        const isSsl = request.url.startsWith('https');
        domain = await invoke<MockDomain>('mock_forge_add_domain', {
          hostname,
          ssl: isSsl,
        });
      }

      const responseHeaders: Record<string, string> = {};
      if (request.response_headers) {
        for (const [key, val] of Object.entries(request.response_headers)) {
          const lowerKey = key.toLowerCase();
          if (lowerKey !== 'content-encoding' && lowerKey !== 'content-length' && lowerKey !== 'transfer-encoding') {
            responseHeaders[key] = val;
          }
        }
      }

      const requestQueryParams: { key: string; value: string; enabled: boolean }[] = [];
      if (request.url.includes('?')) {
        const queryStr = request.url.substring(request.url.indexOf('?') + 1);
        const pairs = queryStr.split('&');
        for (const pair of pairs) {
          const eq = pair.indexOf('=');
          if (eq !== -1) {
            const key = decodeURIComponent(pair.substring(0, eq));
            const value = decodeURIComponent(pair.substring(eq + 1));
            requestQueryParams.push({ key, value, enabled: true });
          } else if (pair) {
            requestQueryParams.push({ key: decodeURIComponent(pair), value: '', enabled: true });
          }
        }
      }

      const matchers: { headerKey: string; headerValue: string }[] = [];
      if (request.headers) {
        for (const [key, val] of Object.entries(request.headers)) {
          matchers.push({
            headerKey: key,
            headerValue: val,
          });
        }
      }

      const route = {
        domainId: domain.id,
        method: request.method,
        path: request.path || '/',
        statusCode: request.response_status || 200,
        responseBody: request.response_body || '',
        responseHeaders,
        matchers,
        chaos: { latencyMode: 'none' },
        enabled: true,
        matcherEnabled: true,
        requestQueryParams,
        requestBody: request.request_body || undefined,
      };

      const newRoute = await invoke<MockRoute>('mock_forge_add_route', { route });

      const store = useMockForgeStore.getState();
      const updatedDomains = store.domains.some((d) => d.id === domain.id) ? store.domains : [...store.domains, domain];
      store.setDomains(updatedDomains);
      store.setRoutes([...store.routes, newRoute]);

      useNavStore.getState().openWindow('/mock-forge', 'Mock Forge');
      useNavStore.getState().focusWindow('/mock-forge');
      useNavStore.getState().triggerNavBlink('/mock-forge');

      toast.success(`Mock created for ${request.method} ${hostname}${request.path}`);
    } catch (error) {
      console.error('Failed to send to Mock Forge:', error);
      toast.error('Failed to create mock in Mock Forge');
    }
  }, [call.id]);

  const handleSaveToDocuments = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      useDocumentsStore.getState().addApiEntryToActiveDocument({
        sourceHistoryId: request.id,
        method: request.method,
        url: request.url,
        host: request.host,
        path: request.path,
        headers: request.headers,
        requestBody: request.request_body,
        responseStatus: request.response_status,
        responseContentType: request.response_content_type,
        capturedAt: request.timestamp,
      });
      toast.success('Saved API to active document');
    } catch (error) {
      console.error('Failed to save API to documents:', error);
      toast.error('Failed to save API to documents');
    }
  }, [call.id]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteHistoryLog(call.id);
      usePinnedRequestsStore.getState().unpinId(call.id);
      removeRequestFromAllGroups(call.id);
      onDelete?.(call.id);
      triggerRefresh();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  }, [call.id, onDelete, triggerRefresh, removeRequestFromAllGroups]);

  const handleBlacklistHost = useCallback(() => {
    useBlacklistStore.getState().addRule(call.host);
  }, [call.host]);

  const handleBlacklistHostAndPath = useCallback(() => {
    useBlacklistStore.getState().addRule(call.host, call.path);
  }, [call.host, call.path]);

  const handleHighlightHost = useCallback((color: string) => {
    useHighlightStore.getState().highlightHost(call.host, call.path, color);
  }, [call.host, call.path]);

  return {
    pinned,
    groups,
    requestGroupIds,
    addRequestToGroup,
    removeRequestFromGroup,
    handleQuickAddToGroup,
    handleTogglePin,
    handleCopyCurlCommand,
    handleCopyUrl,
    handleAddToScope,
    handleOpenInInvoker,
    handleOpenInRepeater,
    handleSendToCollection,
    handleSendToIntercept,
    handleSendToMockForge,
    handleOpenInBrowserAutomation,
    handleSaveToDocuments,
    handleDelete,
    handleBlacklistHost,
    handleBlacklistHostAndPath,
    handleHighlightHost,
  };
}
