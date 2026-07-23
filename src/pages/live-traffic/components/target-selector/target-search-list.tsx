import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PencilIcon, MagnifyingGlassIcon, XIcon, TargetIcon, CheckCircleIcon } from '@phosphor-icons/react';
import type { Target } from '@/types';

interface TargetSearchListProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  targetCount: number;
  filteredTargets: Target[];
  onSelectTarget: (target: Target) => void;
  onEditTarget: (target: Target) => void;
}

export function TargetSearchList({
  searchQuery,
  setSearchQuery,
  targetCount,
  filteredTargets,
  onSelectTarget,
  onEditTarget,
}: TargetSearchListProps) {
  const showSearch = targetCount >= 5 || searchQuery.length > 0;

  return (
    <div className="space-y-3">
      {showSearch && (
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Filter targets by name or pattern..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-8 text-xs focus-visible:ring-1"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-sm"
              aria-label="Clear search"
            >
              <XIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      <div className="rounded-md border border-border bg-card/50 overflow-hidden">
        {filteredTargets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground px-4">
            <TargetIcon className="h-8 w-8 text-muted-foreground/40 mb-2 stroke-[1.5]" />
            <p className="text-xs font-medium">
              {searchQuery ? 'No targets match your query' : 'No targets configured yet'}
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              {searchQuery ? 'Try typing a different keyword or create a target.' : 'Click below to add your first monitoring target.'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[220px]">
            <div className="p-1.5 space-y-1">
              {filteredTargets.map((target) => {
                const primaryScope = target.scope[0];
                const extraScopeCount = target.scope.length - 1;

                return (
                  <div
                    key={target.id}
                    className="group relative flex items-center justify-between gap-2 rounded-sm border border-transparent p-2 hover:border-border/60 hover:bg-accent/50 active:scale-[0.985] transition-all duration-150 ease-out cursor-pointer"
                    onClick={() => onSelectTarget(target)}
                  >
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {target.name}
                        </span>
                        {target.tabActive && (
                          <Badge variant="outline" className="h-4 px-1.5 text-[10px] gap-1 border-primary/30 bg-primary/10 text-primary font-normal">
                            <CheckCircleIcon className="h-2.5 w-2.5 fill-primary text-primary-foreground" />
                            Active
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                        {primaryScope ? (
                          <span className="font-mono text-[10.5px] bg-muted/60 px-1 py-0.2 rounded text-muted-foreground truncate">
                            {primaryScope}
                          </span>
                        ) : (
                          <span className="italic text-muted-foreground/60">No scope specified</span>
                        )}

                        {extraScopeCount > 0 && (
                          <span className="text-[10px] font-medium text-muted-foreground/80 shrink-0">
                            +{extraScopeCount} more
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 opacity-80 group-hover:opacity-100 hover:bg-background/80 active:scale-95 transition-all"
                      aria-label={`Edit ${target.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTarget(target);
                      }}
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

