import * as React from 'react';
import { Asterisk } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { getEffectiveProxyPort, useAppStore } from '@/stores/app';
import { cn } from '@/lib/utils';

export function ProxyButton() {
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

  return (
    <div className="group flex items-center gap-2" title={title}>
      <Badge
        variant={'secondary'}
        className={cn(
          isConnected ? 'text-green-500' : '',
          "h-6 px-1.5 text-xs transition-all rounded-md duration-300 group-hover:px-2 gap-0")}
      >
        {isConnected ? (
          <Asterisk className="!size-4 shrink-0 animate-pulse animate-spin [animation-duration:1.2s] fill-current text-green-500" />
        ) : (
          <Asterisk className="!size-4 shrink-0" />
        )}
        <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-1 group-hover:max-w-17 group-hover:opacity-100">
          {isConnected ? 'PROXY ON' : 'PROXY OFF'}
        </span>
      </Badge>
      <Switch
        checked={isConnected}
        onCheckedChange={onToggleProxy}
        disabled={!canToggle}
        className="cursor-pointer"
      />
    </div>
  );
}
