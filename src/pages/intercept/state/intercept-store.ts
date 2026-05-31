import { create } from 'zustand';
import { toast } from 'sonner';

import { parseRawHttpRequest } from '@/lib/http-message';
import { useBruteForceStore } from '@/stores/bruto-force';
import {
  dropInterceptedRequest,
  forwardInterceptedRequest,
  getInterceptStatus,
  getPausedRequests,
  setInterceptEnabled,
} from '../api';
import { buildRawPausedRequest, getRequestHost } from '../lib';
import type { InterceptStatus, PausedRequest } from '../types';

interface InterceptState {
  status: InterceptStatus | null;
  requests: PausedRequest[];
  selectedRequestId: string | null;
  rawRequest: string;
  isBusy: boolean;
  isRefreshing: boolean;
  loadedRequestId: string | null;
  setRawRequest: (rawRequest: string) => void;
  setSelectedRequestId: (requestId: string | null) => void;
  refresh: () => Promise<void>;
  toggleIntercept: (enabled: boolean) => Promise<void>;
  forwardSelectedRequest: () => Promise<void>;
  dropRequest: (request: PausedRequest) => Promise<void>;
  bypassHostAndForward: (request: PausedRequest) => Promise<void>;
}

function getSelectedRequest(requests: PausedRequest[], selectedRequestId: string | null) {
  return requests.find((request) => request.id === selectedRequestId) ?? null;
}

function syncSelectedRequest(
  requests: PausedRequest[],
  selectedRequestId: string | null,
  loadedRequestId: string | null,
  rawRequest: string
) {
  const nextSelectedRequest =
    getSelectedRequest(requests, selectedRequestId) ?? requests[0] ?? null;

  if (!nextSelectedRequest) {
    return {
      selectedRequestId: null,
      loadedRequestId: null,
      rawRequest: '',
    };
  }

  if (loadedRequestId === nextSelectedRequest.id) {
    return {
      selectedRequestId: nextSelectedRequest.id,
      loadedRequestId,
      rawRequest,
    };
  }

  return {
    selectedRequestId: nextSelectedRequest.id,
    loadedRequestId: nextSelectedRequest.id,
    rawRequest: buildRawPausedRequest(nextSelectedRequest),
  };
}

export const useInterceptStore = create<InterceptState>((set, get) => ({
  status: null,
  requests: [],
  selectedRequestId: null,
  rawRequest: '',
  isBusy: false,
  isRefreshing: false,
  loadedRequestId: null,

  setRawRequest: (rawRequest) => set({ rawRequest }),

  setSelectedRequestId: (requestId) =>
    set((state) => {
      const selectedRequest = getSelectedRequest(state.requests, requestId);

      return {
        selectedRequestId: selectedRequest?.id ?? null,
        loadedRequestId: selectedRequest?.id ?? null,
        rawRequest: selectedRequest ? buildRawPausedRequest(selectedRequest) : '',
      };
    }),

  refresh: async () => {
    set({ isRefreshing: true });

    try {
      const [nextStatus, nextRequests] = await Promise.all([
        getInterceptStatus(),
        getPausedRequests(),
      ]);

      void useBruteForceStore.getState().fetchBypassPatterns();

      set((state) => ({
        status: nextStatus,
        requests: nextRequests,
        ...syncSelectedRequest(
          nextRequests,
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

  toggleIntercept: async (enabled) => {
    try {
      const nextStatus = await setInterceptEnabled(enabled);
      set({ status: nextStatus });
      toast.success(enabled ? 'Intercept enabled' : 'Intercept disabled');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update intercept mode.');
    }
  },

  forwardSelectedRequest: async () => {
    const { rawRequest, requests, selectedRequestId, refresh } = get();
    const selectedRequest = getSelectedRequest(requests, selectedRequestId);
    if (!selectedRequest) {
      return;
    }

    set({ isBusy: true });

    try {
      const parsedRequest = parseRawHttpRequest(rawRequest, {
        fallbackUrl: selectedRequest.request.uri,
      });

      if (!parsedRequest) {
        throw new Error('Request is invalid.');
      }

      await forwardInterceptedRequest(selectedRequest.id, parsedRequest);
      toast.success('Request forwarded');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to forward request.');
    } finally {
      set({ isBusy: false });
    }
  },

  dropRequest: async (request) => {
    const { refresh } = get();
    set({ isBusy: true });

    try {
      await dropInterceptedRequest(request.id);
      toast.success('Request dropped');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to drop request.');
    } finally {
      set({ isBusy: false });
    }
  },

  bypassHostAndForward: async (request) => {
    const { requests, refresh } = get();
    const host = getRequestHost(request);

    set({ isBusy: true });

    try {
      await useBruteForceStore.getState().addBypassPattern(host);

      const matchingRequests = requests.filter((currentRequest) => getRequestHost(currentRequest) === host);

      for (const matchingRequest of matchingRequests) {
        const parsedRequest = parseRawHttpRequest(buildRawPausedRequest(matchingRequest), {
          fallbackUrl: matchingRequest.request.uri,
        });

        if (parsedRequest) {
          await forwardInterceptedRequest(matchingRequest.id, parsedRequest);
        }
      }

      toast.success(`Passthrough ${host} - forwarded ${matchingRequests.length} request(s)`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to bypass host.');
    } finally {
      set({ isBusy: false });
    }
  },
}));
