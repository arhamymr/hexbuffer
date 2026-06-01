import * as React from 'react';
import { toast } from 'sonner';
import { useBruteForceStore } from '@/stores/bruto-force';
import {
  allPositionsHavePayloads,
  findRequestPayloadPositions,
  syncPositionPayloads,
  type AttackConfig,
} from '../types';

export function useBruteForcePage() {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    renameTab,
    closeTab,
    setBaseRequest,
    setPendingRequest,
    clearStartError,
    stopAttack,
    startAttack,
    updateConfig,
  } = useBruteForceStore();

  const activeTab = React.useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0],
    [activeTabId, tabs]
  );

  const config = activeTab?.config;
  const isRunning = activeTab?.isRunning ?? false;
  const progress = activeTab?.progress ?? null;
  const startError = activeTab?.startError ?? null;
  const markedPositions = config
    ? findRequestPayloadPositions(config.base_request)
    : [];
  const hasPayloads = config
    ? allPositionsHavePayloads({
        ...config,
        positions: markedPositions,
      })
    : false;
  const canStart = true;
  const startBlockedReason = !config?.base_request.url
    ? 'Add a request URL'
    : markedPositions.length === 0
      ? 'Mark a payload position with § markers'
      : !hasPayloads
        ? 'Add payloads for every marked position'
        : startError;

  const pendingRequest = useBruteForceStore((s) => s.pendingRequest);

  React.useEffect(() => {
    if (!pendingRequest) {
      return;
    }

    const baseRequest = {
      ...pendingRequest,
      follow_redirects: true,
      max_hops: 10,
    } as AttackConfig['base_request'];

    setBaseRequest(baseRequest);
    const positions = findRequestPayloadPositions(baseRequest);
    updateConfig({
      positions,
      position_payloads: syncPositionPayloads(positions, config?.position_payloads, config?.payload_config),
    });
    setPendingRequest(null);
  }, [config?.payload_config, config?.position_payloads, pendingRequest, setBaseRequest, setPendingRequest, updateConfig]);

  const handleStartAttack = React.useCallback(() => {
    if (!config) return;

    if (!config.base_request.url.trim()) {
      toast.error('Add a request URL before starting');
      return;
    }

    const positions = findRequestPayloadPositions(config.base_request);
    if (positions.length === 0) {
      updateConfig({ positions });
      toast.error('Mark a payload position in the request before starting');
      return;
    }

    if (positions.length !== config.positions.length) {
      updateConfig({
        positions,
        position_payloads: syncPositionPayloads(positions, config.position_payloads, config.payload_config),
      });
    }

    const nextConfig = {
      ...config,
      positions,
      position_payloads: syncPositionPayloads(positions, config.position_payloads, config.payload_config),
    };

    if (!allPositionsHavePayloads(nextConfig)) {
      toast.error('Add payloads for every marked position before starting');
      return;
    }

    startAttack();
  }, [config, startAttack, updateConfig]);

  return {
    tabs: tabs.map((tab) => ({ id: tab.id, name: tab.name })),
    activeTabId,
    setActiveTabId,
    renameTab,
    closeTab,
    activeTab,
    isRunning,
    progress,
    canStart,
    startBlockedReason,
    stopAttack,
    clearStartError,
    handleStartAttack,
  };
}
