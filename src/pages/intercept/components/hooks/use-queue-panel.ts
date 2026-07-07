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
  const setSelectedRequestId = useInterceptStore((state) => state.setSelectedRequestId);
  const forwardSelectedRequest = useInterceptStore((state) => state.forwardSelectedRequest);
  const forwardRequest = useInterceptStore((state) => state.forwardRequest);
  const forwardRequestAndInterceptResponse = useInterceptStore(
    (state) => state.forwardRequestAndInterceptResponse
  );
  const dropRequest = useInterceptStore((state) => state.dropRequest);
  const addCaptureHost = useInterceptStore((state) => state.addCaptureHost);
  const removeCaptureHostAndForward = useInterceptStore((state) => state.removeCaptureHostAndForward);

  const toggleIntercept = useInterceptStore((state) => state.toggleIntercept);

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

  const handleForwardRequest = React.useCallback(
    (request: PausedRequest) => {
      void forwardRequest(request);
    },
    [forwardRequest]
  );

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

  const handleToggleIntercept = React.useCallback(
    (enabled: boolean) => {
      void toggleIntercept(enabled);
    },
    [toggleIntercept]
  );

  return {
    isEnabled,
    activeTab,
    activeRequests,
    hasSelection,
    isBusy,
    selectedRequestId,
    removingIds,
    setSelectedRequestId,
    getRequestMeta,
    handleForward,
    handleForwardRequest,
    handleInterceptResponse,
    handleDrop,
    handleDontCapture,
    handleAddCaptureHost,
    handleToggleIntercept,
  };
}
