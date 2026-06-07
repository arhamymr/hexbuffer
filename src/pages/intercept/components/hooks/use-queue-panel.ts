import * as React from 'react';
import { useInterceptStore } from '../../state/intercept-store';
import { getPausedDirection, getRequestHost, getRequestPath } from '../../lib';
import type { PausedRequest } from '../../types';

export function useQueuePanel() {
  const status = useInterceptStore((state) => state.status);
  const requests = useInterceptStore((state) => state.requests);
  const tabs = useInterceptStore((state) => state.tabs);
  const activeTabId = useInterceptStore((state) => state.activeTabId);
  const selectedRequestId = useInterceptStore((state) => state.selectedRequestId);
  const isBusy = useInterceptStore((state) => state.isBusy);
  const isRefreshing = useInterceptStore((state) => state.isRefreshing);
  const setSelectedRequestId = useInterceptStore((state) => state.setSelectedRequestId);
  const forwardSelectedRequest = useInterceptStore((state) => state.forwardSelectedRequest);
  const forwardRequestAndInterceptResponse = useInterceptStore(
    (state) => state.forwardRequestAndInterceptResponse
  );
  const dropRequest = useInterceptStore((state) => state.dropRequest);
  const refresh = useInterceptStore((state) => state.refresh);
  const addCaptureHost = useInterceptStore((state) => state.addCaptureHost);
  const removeCaptureHostAndForward = useInterceptStore((state) => state.removeCaptureHostAndForward);

  const [removingIds, setRemovingIds] = React.useState<Set<string>>(new Set());

  const isEnabled = status?.mode === 'Enabled';
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const activeRequests = requests.filter((request) => request.tab_id === activeTabId);
  const hasSelection = activeRequests.some((request) => request.id === selectedRequestId);

  const getRequestMeta = React.useCallback((request: PausedRequest) => {
    return {
      direction: getPausedDirection(request),
      host: getRequestHost(request),
      path: getRequestPath(request),
    };
  }, []);

  const handleForward = React.useCallback(() => {
    void forwardSelectedRequest();
  }, [forwardSelectedRequest]);

  const handleRefresh = React.useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleInterceptResponse = React.useCallback(
    (request: PausedRequest) => {
      void forwardRequestAndInterceptResponse(request);
    },
    [forwardRequestAndInterceptResponse]
  );

  const handleDrop = React.useCallback(
    (request: PausedRequest) => {
      setRemovingIds((prev) => new Set([...prev, request.id]));
      void dropRequest(request);
    },
    [dropRequest]
  );

  const handleDontCapture = React.useCallback(
    (request: PausedRequest) => {
      setRemovingIds((prev) => new Set([...prev, request.id]));
      void removeCaptureHostAndForward(request);
    },
    [removeCaptureHostAndForward]
  );

  const handleAddCaptureHost = React.useCallback(
    (host: string) => {
      addCaptureHost(host);
    },
    [addCaptureHost]
  );

  return {
    isEnabled,
    activeTab,
    activeRequests,
    hasSelection,
    isBusy,
    isRefreshing,
    selectedRequestId,
    removingIds,
    setSelectedRequestId,
    getRequestMeta,
    handleForward,
    handleRefresh,
    handleInterceptResponse,
    handleDrop,
    handleDontCapture,
    handleAddCaptureHost,
  };
}
