'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Target } from '@/types';
import type { FilterMode } from '@/stores/proxyStore';
import { ScopeManager } from '@/components/scope-manager';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProxyHeaderProps {
  target: Target;
  targets: Target[];
  onTargetsUpdated: () => void;
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
}

export function ProxyHeader({ target, targets, onTargetsUpdated, filterMode, onFilterModeChange }: ProxyHeaderProps) {
  const scopeDisplay = target.scope.length > 0
    ? target.scope.slice(0, 2).join(', ') + (target.scope.length > 2 ? '...' : '')
    : 'No scope';

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold">{target.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant='secondary' className="font-normal text-xs">
              {scopeDisplay}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ScopeManager
          target={target}
          targets={targets}
          onScopeUpdated={onTargetsUpdated}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {filterMode === 'scoped' ? 'Scoped' : 'All Traffic'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onFilterModeChange('scoped')}>
              Scoped
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFilterModeChange('all')}>
              All Traffic
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function matchesScope(host: string, scope: string[]): boolean {
  for (const pattern of scope) {
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(2);
      if (host.endsWith(suffix) && host.length > suffix.length) {
        return true;
      }
    } else if (host === pattern) {
      return true;
    }
  }
  return false;
}