'use client';

import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FilterState } from './types';
import { METHOD_FILTERS, STATUS_FILTERS } from './constants';

interface LogFiltersProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  onClearFilters: () => void;
}

export function LogFilters({ filter, onFilterChange, onClearFilters }: LogFiltersProps) {
  const hasActiveFilters = filter.search || filter.methods.size > 0 || filter.statusCodes.size > 0;

  const toggleMethod = (method: string) => {
    const next = new Set(filter.methods);
    if (next.has(method)) {
      next.delete(method);
    } else {
      next.add(method);
    }
    onFilterChange({ ...filter, methods: next });
  };

  const toggleStatus = (status: string) => {
    const next = new Set(filter.statusCodes);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    onFilterChange({ ...filter, statusCodes: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search URL, host, method, body..."
          value={filter.search}
          onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
          className="flex-1"
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Method:</span>
          <div className="flex gap-1">
            {METHOD_FILTERS.map(method => (
              <button
                key={method}
                onClick={() => toggleMethod(method)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  filter.methods.has(method)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-muted-foreground/30 hover:bg-muted'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status:</span>
          <div className="flex gap-1">
            {STATUS_FILTERS.map(status => (
              <button
                key={status.label}
                onClick={() => toggleStatus(status.label)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  filter.statusCodes.has(status.label)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-muted-foreground/30 hover:bg-muted'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
