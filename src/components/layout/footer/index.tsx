import * as React from 'react';
import { getEffectiveProxyPort, useAppStore } from '@/stores/app';
import { proxyStatusLabel } from './utils';
import { ProxyStatusIndicator } from './proxy-status';
import pkg from '../../../../package.json';

export function AppFooter() {
  const proxyStatus = useAppStore((state) => state.proxyStatus);
  const proxyPort = useAppStore((state) => state.proxyPort);
  const proxyDefaultPort = useAppStore((state) => state.proxyDefaultPort);
  const checkProxyStatus = useAppStore((state) => state.checkProxyStatus);

  const activeProxyPort = getEffectiveProxyPort({ proxyPort, proxyDefaultPort });
  const isDefaultPortChanged = proxyStatus === 'connected' && proxyPort !== null && proxyPort !== proxyDefaultPort;
  const proxyTitle = isDefaultPortChanged
    ? `Proxy connected on ${activeProxyPort}. Restart to use configured port ${proxyDefaultPort}.`
    : `Proxy ${proxyStatusLabel[proxyStatus].toLowerCase()}`;

  React.useEffect(() => {
    checkProxyStatus();
    const interval = window.setInterval(() => {
      checkProxyStatus();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [checkProxyStatus]);

  return (
    <footer className="border-t px-4 py-1.5 flex items-center justify-between text-xs text-muted-foreground bg-background">
      <div className="flex items-center justify-between gap-4 w-full">
        <span>© hexbuffer v{pkg.version}</span>
        <ProxyStatusIndicator
          proxyStatus={proxyStatus}
          activeProxyPort={activeProxyPort}
          isDefaultPortChanged={isDefaultPortChanged}
          proxyTitle={proxyTitle}
        />
      </div>
    </footer>
  );
}
