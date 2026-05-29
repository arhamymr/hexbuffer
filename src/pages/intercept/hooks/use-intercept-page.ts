import * as React from 'react';
import { toast } from 'sonner';
import { parseRawHttpRequest } from '@/lib/http-message';
import {
  dropInterceptedRequest,
  forwardInterceptedRequest,
  getInterceptStatus,
  getPausedRequests,
  setInterceptEnabled,
} from '../api';
import { buildRawPausedRequest, getRequestHost } from '../lib';
import type { InterceptStatus, PausedRequest } from '../types';
import { useBruteForceStore } from '@/stores/bruto-force';

export function useInterceptPage() {
  const [status, setStatus] = React.useState<InterceptStatus | null>(null);
  const [requests, setRequests] = React.useState<PausedRequest[]>([]);
  const [selectedRequestId, setSelectedRequestId] = React.useState<string | null>(null);
  const [rawRequest, setRawRequest] = React.useState('');
  const [isBusy, setIsBusy] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const loadedRequestIdRef = React.useRef<string | null>(null);
  const fetchBypassPatterns = useBruteForceStore((s) => s.fetchBypassPatterns);

  const selectedRequest = React.useMemo(
    () => requests.find((request) => request.id === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

  const refresh = React.useCallback(async () => {
    setIsRefreshing(true);

    try {
      const [nextStatus, nextRequests] = await Promise.all([
        getInterceptStatus(),
        getPausedRequests(),
      ]);

      setStatus(nextStatus);
      setRequests(nextRequests);
      fetchBypassPatterns();

      setSelectedRequestId((currentId) => {
        if (currentId && nextRequests.some((request) => request.id === currentId)) {
          return currentId;
        }

        return nextRequests[0]?.id ?? null;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refresh intercept state.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 1000);

    return () => window.clearInterval(intervalId);
  }, [refresh]);

  React.useEffect(() => {
    if (!selectedRequest) {
      loadedRequestIdRef.current = null;
      setRawRequest('');
      return;
    }

    if (loadedRequestIdRef.current === selectedRequest.id) {
      return;
    }

    loadedRequestIdRef.current = selectedRequest.id;
    setRawRequest(buildRawPausedRequest(selectedRequest));
  }, [selectedRequest]);

  const toggleIntercept = React.useCallback(async (enabled: boolean) => {
    try {
      const nextStatus = await setInterceptEnabled(enabled);
      setStatus(nextStatus);
      toast.success(enabled ? 'Intercept enabled' : 'Intercept disabled');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update intercept mode.');
    }
  }, []);

  const forwardSelectedRequest = React.useCallback(async () => {
    if (!selectedRequest) {
      return;
    }

    setIsBusy(true);

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
      setIsBusy(false);
    }
  }, [rawRequest, refresh, selectedRequest]);

  const dropSelectedRequest = React.useCallback(async (request: PausedRequest) => {
    setIsBusy(true);

    try {
      await dropInterceptedRequest(request.id);
      toast.success('Request dropped');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to drop request.');
    } finally {
      setIsBusy(false);
    }
  }, [refresh]);

  const bypassHostAndForward = React.useCallback(
    async (request: PausedRequest) => {
      const host = getRequestHost(request);
      setIsBusy(true);

      try {
        await useBruteForceStore.getState().addBypassPattern(host);

        const sameHostIds = requests
          .filter((r) => getRequestHost(r) === host)
          .map((r) => r.id);

        for (const id of sameHostIds) {
          const req = requests.find((r) => r.id === id);
          if (req) {
            const rawReq = buildRawPausedRequest(req);
            const parsedRequest = parseRawHttpRequest(rawReq, {
              fallbackUrl: req.request.uri,
            });
            if (parsedRequest) {
              await forwardInterceptedRequest(id, parsedRequest);
            }
          }
        }

        toast.success(`Passthrough ${host} — forwarded ${sameHostIds.length} request(s)`);
        await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to bypass host.');
      } finally {
        setIsBusy(false);
      }
    },
    [requests, refresh]
  );

  return {
    status,
    requests,
    selectedRequestId,
    rawRequest,
    isBusy,
    isRefreshing,
    setSelectedRequestId,
    setRawRequest,
    refresh,
    toggleIntercept,
    forwardSelectedRequest,
    dropSelectedRequest,
    bypassHostAndForward,
  };
}
