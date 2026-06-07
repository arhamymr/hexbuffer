import { Asterisk } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useProxyButton } from './hooks/use-proxy-button';

export function ProxyButton() {
  const { canToggle, isConnected, onToggleProxy, title } = useProxyButton();

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
