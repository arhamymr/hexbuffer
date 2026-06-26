import { useAppStore } from '@/stores/app';
import { Button } from '@/components/ui/button';
import { Server, Loader2 } from 'lucide-react';

export function ProxyWidget() {
  const {
    proxyStatus,
    proxyPort,
    proxyDefaultPort,
    startProxy,
    stopProxy
  } = useAppStore();

  const handleProxyToggle = async () => {
    if (proxyStatus === 'connected') {
      await stopProxy();
    } else if (proxyStatus === 'disconnected') {
      await startProxy();
    }
  };

  const activePort = proxyPort ?? proxyDefaultPort;

  return (
    <div className="p-2 rounded-md border bg-background/30 dark:bg-background/10 backdrop-blur-md flex flex-col gap-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">Proxy Server</span>
        </div>
        {proxyStatus === 'connected' && (
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 mt-0.5">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate text-foreground">
            {proxyStatus === 'connected' ? (
              <span className="text-emerald-500">Connected</span>
            ) : proxyStatus === 'starting' ? (
              <span className="text-amber-500 animate-pulse">Starting...</span>
            ) : proxyStatus === 'stopping' ? (
              <span className="text-amber-500 animate-pulse">Stopping...</span>
            ) : (
              <span className="text-muted-foreground">Disconnected</span>
            )}
          </div>
          {proxyStatus === 'connected' && (
            <div className="text-[9px] text-muted-foreground mt-0.5 font-mono">Port {activePort}</div>
          )}
        </div>

        <Button
          onClick={handleProxyToggle}
          disabled={proxyStatus === 'starting' || proxyStatus === 'stopping'}
          variant={proxyStatus === 'connected' ? 'destructive' : 'default'}
          className="h-6 px-2.5 text-[10px] font-medium shrink-0"
        >
          {proxyStatus === 'starting' || proxyStatus === 'stopping' ? (
            <Loader2 className="size-3 animate-spin" />
          ) : proxyStatus === 'connected' ? (
            'Stop'
          ) : (
            'Start'
          )}
        </Button>
      </div>
    </div>
  );
}
