import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';

import { parseRawHttpRequest, parseRawHttpResponse } from '@/lib/http-message';
import {
  forwardRequest as orchForwardRequest,
  forwardResponse as orchForwardResponse,
  dropRequest as orchDropRequest,
  forwardTab as orchForwardTab,
} from '@/triggers/intercept';
import {
  toggleIntercept as orchToggleIntercept,
} from '@/triggers/intercept';
import {
  getInterceptStatus,
  getPausedRequests,
  setInterceptScope,
} from '../api';
import { buildRawPausedMessage, buildRawPausedRequest, getPausedDirection, getRequestHost } from '../lib';
import type { InterceptStatus, InterceptTab, PausedRequest } from '../types';
import { createInterceptTab } from '../types';

interface InterceptState {
  tabs: InterceptTab[];
  activeTabId: string;
  nextTabNumber: number;
  status: InterceptStatus | null;
  requests: PausedRequest[];
  selectedRequestId: string | null;
  rawRequest: string;
  selectedDirection: 'request' | 'response' | null;
  isBusy: boolean;
  isRefreshing: boolean;
  loadedRequestId: string | null;
  setActiveTabId: (tabId: string) => void;
  addTab: () => void;
  addTabForHost: (host: string) => string | null;
  renameTab: (tabId: string, name: string) => void;
  closeTab: (tabId: string) => Promise<void>;
  closeTabsToLeft: (tabId: string) => Promise<void>;
  closeTabsToRight: (tabId: string) => Promise<void>;
  addCaptureHost: (host: string) => void;
  removeCaptureHost: (host: string) => void;
  removeCaptureHostAndForward: (request: PausedRequest) => Promise<void>;
  setRawRequest: (rawRequest: string) => void;
  setSelectedRequestId: (requestId: string | null) => void;
  refresh: () => Promise<void>;
  syncActiveScope: () => Promise<void>;
  toggleIntercept: (enabled: boolean) => Promise<void>;
  forwardSelectedRequest: () => Promise<void>;
  forwardRequestAndInterceptResponse: (request: PausedRequest) => Promise<void>;
  dropRequest: (request: PausedRequest) => Promise<void>;
}

const initialTab = createInterceptTab(1);

function normalizeHost(host: string): string {
  return host.trim().toLowerCase();
}

function capturePatternMatchesHost(pattern: string, host: string): boolean {
  const normalizedPattern = normalizeHost(pattern);
  const normalizedHost = normalizeHost(host);
  const hostWithoutPort = normalizedHost.split(':')[0] ?? normalizedHost;

  if (normalizedPattern.startsWith('*.')) {
    const domain = normalizedPattern.slice(2);
    return normalizedHost.endsWith(domain) || hostWithoutPort.endsWith(domain);
  }

  return normalizedPattern === normalizedHost || normalizedPattern === hostWithoutPort;
}

function getActiveTab(tabs: InterceptTab[], activeTabId: string): InterceptTab {
  return tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
}

function getRequestsForTab(requests: PausedRequest[], tabId: string) {
  return requests.filter((request) => request.tab_id === tabId);
}

function getSelectedRequest(requests: PausedRequest[], selectedRequestId: string | null) {
  return requests.find((request) => request.id === selectedRequestId) ?? null;
}

function syncSelectedRequest(
  requests: PausedRequest[],
  activeTabId: string,
  selectedRequestId: string | null,
  loadedRequestId: string | null,
  rawRequest: string
) {
  const tabRequests = getRequestsForTab(requests, activeTabId);
  const nextSelectedRequest =
    getSelectedRequest(tabRequests, selectedRequestId) ?? tabRequests[0] ?? null;

  if (!nextSelectedRequest) {
    return {
      selectedRequestId: null,
      loadedRequestId: null,
      rawRequest: '',
      selectedDirection: null,
    };
  }

  const selectedDirection = getPausedDirection(nextSelectedRequest);

  if (loadedRequestId === nextSelectedRequest.id) {
    return {
      selectedRequestId: nextSelectedRequest.id,
      loadedRequestId,
      rawRequest,
      selectedDirection,
    };
  }

  return {
    selectedRequestId: nextSelectedRequest.id,
    loadedRequestId: nextSelectedRequest.id,
    rawRequest: buildRawPausedMessage(nextSelectedRequest),
    selectedDirection,
  };
}

async function forwardPausedItem(request: PausedRequest) {
  if (request.response) {
    await orchForwardResponse(request.id, {
      status: request.response.status_code,
      status_text: request.response.status_text,
      headers: request.response.headers,
      body: new TextDecoder().decode(new Uint8Array(request.response.body)),
    });
    return;
  }

  const parsedRequest = parseRawHttpRequest(buildRawPausedRequest(request), {
    fallbackUrl: request.request.uri,
  });

  if (parsedRequest) {
    await orchForwardRequest(request.id, parsedRequest);
  }
}

export const useInterceptStore = create<InterceptState>()(
  persist(
    (set, get) => ({
      tabs: [initialTab],
      activeTabId: initialTab.id,
      nextTabNumber: 2,
      status: null,
      requests: [],
      selectedRequestId: null,
      rawRequest: '',
      selectedDirection: null,
      isBusy: false,
      isRefreshing: false,
      loadedRequestId: null,

      setActiveTabId: (tabId) => {
        set((state) => ({
          activeTabId: state.tabs.some((tab) => tab.id === tabId) ? tabId : state.activeTabId,
          ...syncSelectedRequest(state.requests, tabId, null, null, ''),
        }));
        void get().syncActiveScope();
      },

      addTab: () => {
        const tab = createInterceptTab(get().nextTabNumber);
        set((state) => ({
          tabs: [...state.tabs, tab],
          activeTabId: tab.id,
          nextTabNumber: state.nextTabNumber + 1,
          ...syncSelectedRequest(state.requests, tab.id, null, null, ''),
        }));
        void get().syncActiveScope();
      },

      addTabForHost: (host) => {
        const normalized = normalizeHost(host);
        if (!normalized) {
          return null;
        }

        const tab = {
          ...createInterceptTab(get().nextTabNumber),
          name: normalized,
          captureHosts: [normalized],
        };

        set((state) => ({
          tabs: [...state.tabs, tab],
          activeTabId: tab.id,
          nextTabNumber: state.nextTabNumber + 1,
          ...syncSelectedRequest(state.requests, tab.id, null, null, ''),
        }));
        void get().syncActiveScope();

        return tab.id;
      },

      renameTab: (tabId, name) =>
        set((state) => ({
          tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, name } : tab)),
        })),

      closeTab: async (tabId) => {
        const state = get();
        const tabIndex = state.tabs.findIndex((tab) => tab.id === tabId);

        if (tabIndex === -1) {
          return;
        }

        set({ isBusy: true });

        try {
          await orchForwardTab(tabId);
          const remainingTabs = state.tabs.filter((tab) => tab.id !== tabId);
          const tabs = remainingTabs.length ? remainingTabs : [createInterceptTab(1)];
          const fallbackTab = tabs[Math.max(0, tabIndex - 1)] ?? tabs[0];
          const activeTabId = state.activeTabId === tabId ? fallbackTab.id : state.activeTabId;
          const nextRequests = state.requests.filter((request) => request.tab_id !== tabId);

          set({
            tabs,
            activeTabId,
            requests: nextRequests,
            nextTabNumber: remainingTabs.length ? state.nextTabNumber : 2,
            ...syncSelectedRequest(nextRequests, activeTabId, null, null, ''),
          });
          await get().syncActiveScope();
          await get().refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to close intercept tab.');
        } finally {
          set({ isBusy: false });
        }
      },

      closeTabsToLeft: async (tabId) => {
        const state = get();
        const tabIndex = state.tabs.findIndex((tab) => tab.id === tabId);
        if (tabIndex <= 0) {
          return;
        }

        const closingTabs = state.tabs.slice(0, tabIndex);
        set({ isBusy: true });

        try {
          for (const tab of closingTabs) {
            await orchForwardTab(tab.id);
          }

          const tabs = state.tabs.slice(tabIndex);
          const activeTabId = tabs.some((tab) => tab.id === state.activeTabId)
            ? state.activeTabId
            : tabId;
          const closingTabIds = new Set(closingTabs.map((tab) => tab.id));
          const nextRequests = state.requests.filter((request) => !request.tab_id || !closingTabIds.has(request.tab_id));

          set({
            tabs,
            activeTabId,
            requests: nextRequests,
            ...syncSelectedRequest(nextRequests, activeTabId, null, null, ''),
          });
          await get().syncActiveScope();
          await get().refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to close intercept tabs.');
        } finally {
          set({ isBusy: false });
        }
      },

      closeTabsToRight: async (tabId) => {
        const state = get();
        const tabIndex = state.tabs.findIndex((tab) => tab.id === tabId);
        if (tabIndex === -1 || tabIndex === state.tabs.length - 1) {
          return;
        }

        const closingTabs = state.tabs.slice(tabIndex + 1);
        set({ isBusy: true });

        try {
          for (const tab of closingTabs) {
            await orchForwardTab(tab.id);
          }

          const tabs = state.tabs.slice(0, tabIndex + 1);
          const activeTabId = tabs.some((tab) => tab.id === state.activeTabId)
            ? state.activeTabId
            : tabId;
          const closingTabIds = new Set(closingTabs.map((tab) => tab.id));
          const nextRequests = state.requests.filter((request) => !request.tab_id || !closingTabIds.has(request.tab_id));

          set({
            tabs,
            activeTabId,
            requests: nextRequests,
            ...syncSelectedRequest(nextRequests, activeTabId, null, null, ''),
          });
          await get().syncActiveScope();
          await get().refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to close intercept tabs.');
        } finally {
          set({ isBusy: false });
        }
      },

      addCaptureHost: (host) => {
        const normalized = normalizeHost(host);
        if (!normalized) {
          return;
        }

        set((state) => ({
          tabs: state.tabs.map((tab) => {
            if (tab.id !== state.activeTabId || tab.captureHosts.includes(normalized)) {
              return tab;
            }

            return { ...tab, captureHosts: [...tab.captureHosts, normalized] };
          }),
        }));
        void get().syncActiveScope();
      },

      removeCaptureHost: (host) => {
        const normalized = normalizeHost(host);
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === state.activeTabId
              ? { ...tab, captureHosts: tab.captureHosts.filter((pattern) => !capturePatternMatchesHost(pattern, normalized)) }
              : tab
          ),
        }));
        void get().syncActiveScope();
      },

      removeCaptureHostAndForward: async (request) => {
        const host = normalizeHost(getRequestHost(request));
        const { activeTabId, refresh } = get();

        set({ isBusy: true });

        try {
          get().removeCaptureHost(host);

          const matchingRequests = get().requests.filter(
            (currentRequest) => currentRequest.tab_id === activeTabId && getRequestHost(currentRequest).toLowerCase() === host
          );

          for (const matchingRequest of matchingRequests) {
            await forwardPausedItem(matchingRequest);
          }

          toast.success(`Stopped capturing ${host} - forwarded ${matchingRequests.length} item(s)`);
          await refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to stop capturing host.');
        } finally {
          set({ isBusy: false });
        }
      },

      setRawRequest: (rawRequest) => set({ rawRequest }),

      setSelectedRequestId: (requestId) =>
        set((state) => {
          const tabRequests = getRequestsForTab(state.requests, state.activeTabId);
          const selectedRequest = getSelectedRequest(tabRequests, requestId);

          return {
            selectedRequestId: selectedRequest?.id ?? null,
            loadedRequestId: selectedRequest?.id ?? null,
            rawRequest: selectedRequest ? buildRawPausedMessage(selectedRequest) : '',
            selectedDirection: selectedRequest ? getPausedDirection(selectedRequest) : null,
          };
        }),

      refresh: async () => {
        set({ isRefreshing: true });

        try {
          const [nextStatus, nextRequests] = await Promise.all([
            getInterceptStatus(),
            getPausedRequests(),
          ]);

          set((state) => ({
            status: nextStatus,
            requests: nextRequests,
            ...syncSelectedRequest(
              nextRequests,
              state.activeTabId,
              state.selectedRequestId,
              state.loadedRequestId,
              state.rawRequest
            ),
          }));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to refresh intercept state.');
        } finally {
          set({ isRefreshing: false });
        }
      },

      syncActiveScope: async () => {
        const { tabs, activeTabId } = get();
        const activeTab = getActiveTab(tabs, activeTabId);
        await setInterceptScope(activeTab.id, activeTab.captureHosts);
      },

      toggleIntercept: async (enabled) => {
        try {
          const nextStatus = await orchToggleIntercept(enabled);
          await get().syncActiveScope();
          set({ status: nextStatus });
          toast.success(enabled ? 'Intercept enabled' : 'Intercept disabled');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to update intercept mode.');
        }
      },

      forwardSelectedRequest: async () => {
        const { activeTabId, rawRequest, requests, selectedRequestId, refresh } = get();
        const selectedRequest = getSelectedRequest(getRequestsForTab(requests, activeTabId), selectedRequestId);
        if (!selectedRequest) {
          return;
        }

        set({ isBusy: true });

        try {
          if (selectedRequest.response) {
            const parsedResponse = parseRawHttpResponse(rawRequest);

            if (!parsedResponse) {
              throw new Error('Response is invalid.');
            }

            await orchForwardResponse(selectedRequest.id, parsedResponse);
            toast.success('Response forwarded');
          } else {
            const parsedRequest = parseRawHttpRequest(rawRequest, {
              fallbackUrl: selectedRequest.request.uri,
            });

            if (!parsedRequest) {
              throw new Error('Request is invalid.');
            }

            await orchForwardRequest(selectedRequest.id, parsedRequest);
            toast.success('Request forwarded');
          }

          await refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to forward intercepted item.');
        } finally {
          set({ isBusy: false });
        }
      },

      forwardRequestAndInterceptResponse: async (request) => {
        const { loadedRequestId, rawRequest, refresh } = get();

        if (request.response) {
          return;
        }

        set({ isBusy: true });

        try {
          const requestText = loadedRequestId === request.id ? rawRequest : buildRawPausedRequest(request);
          const parsedRequest = parseRawHttpRequest(requestText, {
            fallbackUrl: request.request.uri,
          });

          if (!parsedRequest) {
            throw new Error('Request is invalid.');
          }

          await orchForwardRequest(request.id, parsedRequest, true);
          toast.success('Request forwarded - response will be intercepted');
          await refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to intercept response.');
        } finally {
          set({ isBusy: false });
        }
      },

      dropRequest: async (request) => {
        const { refresh } = get();
        set({ isBusy: true });

        try {
          await orchDropRequest(request.id);
          toast.success(request.response ? 'Response dropped' : 'Request dropped');
          await refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Failed to drop request.');
        } finally {
          set({ isBusy: false });
        }
      },
    }),
    {
      name: '0xbuffer-intercept-tabs',
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        nextTabNumber: state.nextTabNumber,
      }),
      merge: (persistedState, currentState) => {
        const typedState = persistedState as Partial<InterceptState> | undefined;
        const tabs = typedState?.tabs?.length ? typedState.tabs : currentState.tabs;
        const activeTabId = tabs.some((tab) => tab.id === typedState?.activeTabId)
          ? typedState!.activeTabId!
          : tabs[0].id;

        return {
          ...currentState,
          ...typedState,
          tabs,
          activeTabId,
          nextTabNumber: typedState?.nextTabNumber ?? tabs.length + 1,
        };
      },
    }
  )
);
