import { AsteriskIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProxyButton } from './hooks/use-proxy-button';

export function ProxyButton() {
  const { canToggle, isConnected, onToggleProxy, title } = useProxyButton();

  return (
    <div className="group flex items-center gap-2 pl-2" title={title}>
      <Badge
        variant={'secondary'}
        className={cn(
          isConnected ? 'text-green-500' : '',
          "h-6 px-1.5 text-xs transition-all rounded-md duration-300 group-hover:px-2 gap-0")}
      >
        {isConnected ? (
          <AsteriskIcon className="!size-3.5 shrink-0 animate-pulse animate-spin [animation-duration:1.2s] fill-current text-green-500" />
        ) : (
          <AsteriskIcon className="!size-3.5 shrink-0" />
        )}
        <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:ml-1 group-hover:max-w-17 group-hover:opacity-100">
          {isConnected ? 'Proxy On' : 'Proxy Off'}
        </span>
      </Badge>
      <Button
        variant={isConnected ? "destructive" : "outline"}
        size="xs"
        onClick={() => onToggleProxy(!isConnected)}
        disabled={!canToggle}
        className="h-6 text-[10px] px-2 cursor-pointer"
      >
        {isConnected ? 'Stop' : 'Start'}
      </Button>
    </div>
  );
}
