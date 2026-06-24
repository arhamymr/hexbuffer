import * as React from 'react';
import { toast } from 'sonner';

import { getEffectiveProxyPort, useAppStore } from '@/stores/app';

export function useProxyButton() {
  const proxyStatus = useAppStore((state) => state.proxyStatus);
  const proxyPort = useAppStore((state) => state.proxyPort);
  const proxyDefaultPort = useAppStore((state) => state.proxyDefaultPort);
  const startProxy = useAppStore((state) => state.startProxy);
  const stopProxy = useAppStore((state) => state.stopProxy);

  const activeProxyPort = getEffectiveProxyPort({ proxyPort, proxyDefaultPort });
  const canToggle = proxyStatus === 'disconnected' || proxyStatus === 'connected';
  const isConnected = proxyStatus === 'connected';

  const title = activeProxyPort
    ? `Proxy listener 127.0.0.1:${activeProxyPort}`
    : 'Start proxy listener';

  const onToggleProxy = React.useCallback(async (isEnabled: boolean) => {
    if (!canToggle) {
      return;
    }

    if (!isEnabled) {
      try {
        await stopProxy();
        toast.success('Proxy stopped');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to stop proxy');
      }
    } else {
      try {
        await startProxy();
        const { proxyPort, proxyDefaultPort } = useAppStore.getState();
        const activePort = getEffectiveProxyPort({ proxyPort, proxyDefaultPort });
        toast.success(`Proxy started on 127.0.0.1:${activePort}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to start proxy');
      }
    }
  }, [canToggle, startProxy, stopProxy]);

  return {
    canToggle,
    isConnected,
    onToggleProxy,
    title,
  };
}
