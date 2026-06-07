import * as React from 'react';
import { toast } from 'sonner';

import { openInterceptBrowser } from '@/pages/intercept/api';
import { getEffectiveProxyPort, useAppStore } from '@/stores/app';

export function useOpenBrowserButton() {
  const [isOpeningBrowser, setIsOpeningBrowser] = React.useState(false);
  const [showLabel, setShowLabel] = React.useState(true);
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const proxyPort = useAppStore((state) => state.proxyPort);
  const proxyDefaultPort = useAppStore((state) => state.proxyDefaultPort);
  const checkProxyStatus = useAppStore((state) => state.checkProxyStatus);
  const activeProxyPort = getEffectiveProxyPort({ proxyPort, proxyDefaultPort });
  const isDefaultPortChanged = proxyPort !== null && proxyPort !== proxyDefaultPort;

  const startHideTimer = React.useCallback(() => {
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowLabel(false), 30_000);
  }, []);

  React.useEffect(() => {
    startHideTimer();
    return () => clearTimeout(hideTimerRef.current);
  }, [startHideTimer]);

  const handleMouseEnter = React.useCallback(() => {
    setShowLabel(true);
    clearTimeout(hideTimerRef.current);
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    setShowLabel(false);
    clearTimeout(hideTimerRef.current);
  }, []);

  const openBrowserTitle = isDefaultPortChanged
    ? `Open browser through proxy on 127.0.0.1:${activeProxyPort}. Restart the proxy to use configured port ${proxyDefaultPort}.`
    : `Open browser through proxy on 127.0.0.1:${activeProxyPort}`;

  const openBrowser = React.useCallback(async () => {
    setIsOpeningBrowser(true);

    try {
      await checkProxyStatus();
      const { proxyPort, proxyDefaultPort } = useAppStore.getState();
      const activeProxyPort = getEffectiveProxyPort({ proxyPort, proxyDefaultPort });
      await openInterceptBrowser(activeProxyPort);
      const portChangedMessage = proxyPort !== null && proxyPort !== proxyDefaultPort
        ? ` Restart the proxy to use configured port ${proxyDefaultPort}.`
        : '';

      toast.success(`Browser opened with proxy 127.0.0.1:${activeProxyPort}.${portChangedMessage}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open browser.');
    } finally {
      setIsOpeningBrowser(false);
    }
  }, [checkProxyStatus]);

  return {
    handleMouseEnter,
    handleMouseLeave,
    isOpeningBrowser,
    openBrowser,
    openBrowserTitle,
    showLabel,
  };
}
