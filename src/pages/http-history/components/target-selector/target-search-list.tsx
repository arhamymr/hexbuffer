'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useTargetSelectorDialog } from './hooks';

export function TargetSearchList() {
  const { searchQuery, setSearchQuery, filteredTargets, handleSelectTarget } = useTargetSelectorDialog();

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search targets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="max-h-[200px] overflow-y-auto border rounded-md">
        {filteredTargets.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            {searchQuery ? 'No targets match your search' : 'No targets found'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTargets.map((target) => (
              <button
                key={target.id}
                onClick={() => handleSelectTarget({
                  ...target,
                  tabActive: true,
                })}
                className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
              >
                <span className="font-medium">{target.name}</span>
                {target.scope.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({target.scope.length} scope patterns)
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}