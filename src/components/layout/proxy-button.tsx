import * as React from 'react';
import { Loader2, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app';

const proxyButtonLabel = {
  connected: 'Proxy Running',
  starting: 'Starting',
  stopping: 'Stopping',
  disconnected: 'Start Proxy',
} as const;

export function ProxyButton() {
  const proxyStatus = useAppStore((state) => state.proxyStatus);
  const proxyPort = useAppStore((state) => state.proxyPort);
  const proxyDefaultPort = useAppStore((state) => state.proxyDefaultPort);
  const startProxy = useAppStore((state) => state.startProxy);
  const stopProxy = useAppStore((state) => state.stopProxy);
  const [showLabel, setShowLabel] = React.useState(true);
  const hideTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const startHideTimer = React.useCallback(() => {
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowLabel(false), 30_000);
  }, []);

  React.useEffect(() => {
    startHideTimer();
    return () => clearTimeout(hideTimerRef.current);
  }, [startHideTimer]);

  const handleMouseEnter = () => {
    setShowLabel(true);
    clearTimeout(hideTimerRef.current);
  };

  const handleMouseLeave = () => {
    setShowLabel(false);
    clearTimeout(hideTimerRef.current);
  };

  const activeProxyPort = proxyPort ?? proxyDefaultPort;
  const canToggle = proxyStatus === 'disconnected' || proxyStatus === 'connected';
  const isConnected = proxyStatus === 'connected';
  const isTransitioning = proxyStatus === 'starting' || proxyStatus === 'stopping';

  const title = activeProxyPort
    ? `Proxy listener 127.0.0.1:${activeProxyPort}`
    : 'Start proxy listener';

  const handleToggle = React.useCallback(async () => {
    if (isConnected) {
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
        const activePort = proxyPort ?? proxyDefaultPort;
        toast.success(`Proxy started on 127.0.0.1:${activePort}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to start proxy');
      }
    }
  }, [isConnected, startProxy, stopProxy]);

  return (
    <Button
      variant={isConnected ? 'default' : 'destructive'}
      size="xs"
      className="h-6 p-0 gap-0"
      onClick={handleToggle}
      disabled={!canToggle}
      title={title}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isTransitioning ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : isConnected ? (
        <PowerOff className="h-4 w-4 shrink-0" />
      ) : (
        <Power className="h-4 w-4 shrink-0" />
      )}
      <span
        className={cn(
          'transition-all duration-300 overflow-hidden whitespace-nowrap',
          showLabel ? 'max-w-32 opacity-100 ml-2' : 'max-w-0 opacity-0',
        )}
      >
        {proxyButtonLabel[proxyStatus]}
      </span>
    </Button>
  );
}
