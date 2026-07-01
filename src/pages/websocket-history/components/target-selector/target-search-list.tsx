import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PencilSimpleIcon, MagnifyingGlassIcon, TargetIcon } from '@phosphor-icons/react';
import type { Target } from '@/types';
import { motion } from 'motion/react';

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
  const showSearch = targetCount >= 10;

  return (
    <div className="space-y-3 select-none">
      {showSearch && (
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search targets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-background/50 focus-visible:bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-primary/30"
          />
        </div>
      )}

      <ScrollableContainer>
        {filteredTargets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-border/60 rounded-xl bg-muted/5 animate-in fade-in-50 zoom-in-98">
            <TargetIcon className="h-8 w-8 text-muted-foreground/30 stroke-[1.5] mb-2" />
            <span className="text-xs font-semibold text-muted-foreground mb-0.5">
              {searchQuery ? 'No Matching Targets' : 'No Targets Configured'}
            </span>
            <span className="text-[10px] text-muted-foreground/50 max-w-[200px]">
              {searchQuery ? 'Try adjusting your search terms' : 'Add a new target scope to start capturing WebSocket frames.'}
            </span>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {filteredTargets.map((target, idx) => (
              <motion.div
                key={target.id}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.1, delay: Math.min(idx * 0.02, 0.12) }}
                className="group relative flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-background hover:bg-muted/30 hover:border-border/80 transition-all duration-150 active:scale-[0.99] cursor-pointer"
                onClick={() => onSelectTarget(target)}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-10">
                  <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <TargetIcon className="h-4 w-4 text-primary" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-xs text-foreground truncate">
                      {target.name}
                    </span>
                    {target.scope.length > 0 && (
                      <span className="text-[10px] text-muted-foreground/70 truncate">
                        {target.scope.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {target.tabActive && (
                    <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                      Active
                    </span>
                  )}
                  {target.scope.length > 0 && !target.tabActive && (
                    <span className="text-[9px] font-medium text-muted-foreground/75 bg-muted px-1.5 py-0.5 rounded-full border border-border">
                      {target.scope.length} pattern{target.scope.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Edit Button overlay on hover */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-muted/30 via-background/95 to-transparent pl-4 py-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                    aria-label={`Edit ${target.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTarget(target);
                    }}
                  >
                    <PencilSimpleIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollableContainer>
    </div>
  );
}

// Simple wrapper to style the scrollable list container nicely
function ScrollableContainer({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100px]">{children}</div>;
}
