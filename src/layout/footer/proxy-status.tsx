import { AsteriskIcon } from '@phosphor-icons/react';
import { proxyStatusLabel } from './utils';

interface ProxyStatusIndicatorProps {
  proxyStatus: keyof typeof proxyStatusLabel;
  activeProxyPort: number;
  isDefaultPortChanged: boolean;
  proxyTitle: string;
}

export function ProxyStatusIndicator({
  proxyStatus,
  activeProxyPort,
  isDefaultPortChanged,
  proxyTitle,
}: ProxyStatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2" title={proxyTitle}>
      <span
        className={`h-2 w-2 rounded-full ${
          proxyStatus === 'connected'
            ? 'bg-green-500 animate-pulse'
            : proxyStatus === 'starting' || proxyStatus === 'stopping'
            ? 'bg-yellow-500 animate-pulse'
            : 'bg-muted-foreground/50'
        }`}
      />
      <span className='flex items-center'>
        Proxy: {proxyStatusLabel[proxyStatus]} | <AsteriskIcon className='size-3' />:{activeProxyPort}
        {isDefaultPortChanged ? ' (configured port changed)' : ''}
      </span>
    </div>
  );
}
