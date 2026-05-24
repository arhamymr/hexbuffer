import * as React from 'react';
import { toast } from 'sonner';
import { useBruteForceStore } from '@/stores/bruto-force';
import { findRequestPayloadPositions, type AttackConfig } from '../types';

export function useBruteForcePage() {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    renameTab,
    addAttackTab,
    closeTab,
    setBaseRequest,
    setPendingRequest,
    clearStartError,
    stopAttack,
    clearResults,
    startAttack,
    updateConfig,
  } = useBruteForceStore();

  const activeTab = React.useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0],
    [activeTabId, tabs]
  );

  const config = activeTab?.config;

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
    updateConfig({ positions: findRequestPayloadPositions(baseRequest) });
    setPendingRequest(null);
  }, [pendingRequest, setBaseRequest, setPendingRequest, updateConfig]);

  const handleStartAttack = React.useCallback(() => {
    if (!config) return;

    const hasPayloads =
      config.payload_config.payload_type === 'NumberRange' ||
      config.payload_config.values.length > 0 ||
      Boolean(config.payload_config.file_path);

    if (!config.base_request.url.trim()) {
      toast.error('Add a request URL before starting');
      return;
    }

    if (!hasPayloads) {
      toast.error('Add at least one payload before starting');
      return;
    }

    const positions = findRequestPayloadPositions(config.base_request);
    if (positions.length === 0) {
      updateConfig({ positions });
      toast.error('Mark a payload position in the request before starting');
      return;
    }

    if (positions.length !== config.positions.length) {
      updateConfig({ positions });
    }

    startAttack();
  }, [config, startAttack, updateConfig]);

  return {
    tabs: tabs.map((tab) => ({ id: tab.id, name: tab.name })),
    activeTabId,
    setActiveTabId,
    renameTab,
    addAttackTab,
    closeTab,
    activeTab,
    stopAttack,
    clearResults,
    clearStartError,
    handleStartAttack,
  };
}
