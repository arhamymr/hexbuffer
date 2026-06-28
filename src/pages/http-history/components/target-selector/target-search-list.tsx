import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Search } from 'lucide-react';
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
  const showSearch = targetCount >= 10;

  return (
    <div className="space-y-3">
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search targets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      <div className="max-h-[200px] overflow-y-auto border rounded-md">
        {filteredTargets.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            {searchQuery ? 'No targets match your search' : 'No targets found'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTargets.map((target) => (
              <div
                key={target.id}
                className="flex items-center gap-1 px-1 hover:bg-muted transition-colors"
              >
                <button
                  onClick={() => onSelectTarget(target)}
                  className="flex-1 text-left px-2 py-2"
                >
                  <span className="font-medium">{target.name}</span>
                  {target.scope.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({target.scope.length} scope patterns)
                    </span>
                  )}
                </button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  aria-label={`Edit ${target.name}`}
                  onClick={() => onEditTarget(target)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
