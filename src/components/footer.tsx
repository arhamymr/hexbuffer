import * as React from 'react';
import { useAppStore } from '@/stores/app';

const proxyStatusLabel = {
  connected: 'Connected',
  starting: 'Starting',
  disconnected: 'Disconnected',
} as const;

export function AppFooter() {
  const proxyStatus = useAppStore((state) => state.proxyStatus);
  const checkProxyStatus = useAppStore((state) => state.checkProxyStatus);

  React.useEffect(() => {
    checkProxyStatus();

    const interval = window.setInterval(() => {
      checkProxyStatus();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [checkProxyStatus]);

  return (
    <footer className="border-t px-4 py-1.5 flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>© {new Date().getFullYear()} | Apprecon Version 0.1</span>
        <div className="flex items-center gap-2" title={`Proxy ${proxyStatusLabel[proxyStatus].toLowerCase()}`}>
          <span
            className={`h-2 w-2 rounded-full ${
              proxyStatus === 'connected'
                ? 'bg-green-500 animate-pulse'
                : proxyStatus === 'starting'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-muted-foreground/50'
            }`}
          />
          <span>
            Proxy: {proxyStatusLabel[proxyStatus]} | *:8888
          </span>
        </div>
      </div>
    </footer>
  );
}
