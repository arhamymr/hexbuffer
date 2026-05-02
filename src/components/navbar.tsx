'use client';

import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { TargetDialog } from './target-dialog';
import { ScopeManager } from './scope-manager';
import type { Target } from '@/types';

interface NavbarProps {
  className?: string;
  targets: Target[];
  selectedTarget: Target | null;
  onTargetSelect: (target: Target | null) => void;
  onTargetUpdated: () => void;
}

export function Navbar({
  className,
  targets,
  selectedTarget,
  onTargetSelect,
  onTargetUpdated,
}: NavbarProps) {
  return (
    <nav className={cn('flex items-center justify-between h-14 px-4 border-b bg-card', className)}>
      <div className="flex items-center gap-4">
        {selectedTarget && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Target:</span>
            <Badge variant="outline" className="font-medium px-3 py-1">
              {selectedTarget.name}
            </Badge>
            {selectedTarget.scope.length > 0 ? (
              <div className="flex items-center gap-1">
                {selectedTarget.scope.slice(0, 3).map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
                {selectedTarget.scope.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedTarget.scope.length - 3}
                  </Badge>
                )}
              </div>
            ) : (
              <Badge variant="destructive" className="text-xs">
                No Scope
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={selectedTarget?.id || ''}
          onValueChange={(value) => {
            const target = targets.find((t) => t.id === value);
            onTargetSelect(target || null);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Target" />
          </SelectTrigger>
          <SelectContent>
            {targets.length === 0 ? (
              <SelectItem value="empty" disabled>
                No Targets
              </SelectItem>
            ) : (
              targets.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <TargetDialog onTargetCreated={onTargetUpdated} />

        {selectedTarget && <ScopeManager target={selectedTarget} targets={targets} onScopeUpdated={onTargetUpdated} />}
      </div>
    </nav>
  );
}
