import { LightningIcon } from '@phosphor-icons/react';
import type { ChaosConfig } from '../types';

export function ChaosIndicator({ chaos }: { chaos: ChaosConfig }) {
  const parts: string[] = [];
  if (chaos.latencyMode === 'fixed') parts.push(`${chaos.latencyFixed}ms`);
  if (chaos.latencyMode === 'random') parts.push(`${chaos.latencyMin}-${chaos.latencyMax}ms`);
  if (chaos.errorRate) parts.push(`${chaos.errorRate}% err`);
  if (parts.length === 0) return null;
  return (
    <span className="flex items-center gap-1 text-[9px] font-mono text-orange-400">
      <LightningIcon className="h-2.5 w-2.5 fill-orange-400" />
      {parts.join(' · ')}
    </span>
  );
}
