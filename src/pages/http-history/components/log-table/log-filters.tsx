'use client';

import { X, Trash2, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { METHOD_FILTERS, STATUS_FILTERS } from './utils';
import { useLogTableStore } from './store';
import type { FilterState } from './types';

interface LogFiltersProps {
  filter?: FilterState;
  onFilterChange?: (filter: FilterState) => void;
  onClearFilters?: () => void;
  clearCalls?: () => void;
  sitemapVisible?: boolean;
  setSitemapVisible?: (visible: boolean) => void;
}

export function LogFilters({
  filter: filterProp,
  onFilterChange,
  onClearFilters,
  clearCalls: clearCallsProp,
  sitemapVisible = true,
  setSitemapVisible,
}: LogFiltersProps) {
  const storeFilter = useLogTableStore((state) => state.filter);
  const storeSetFilter = useLogTableStore((state) => state.setFilter);
  const toggleMethod = useLogTableStore((state) => state.toggleMethod);
  const toggleStatus = useLogTableStore((state) => state.toggleStatus);
  const storeClearFilters = useLogTableStore((state) => state.clearFilters);
  const storeClearCalls = useLogTableStore((state) => state.clearCalls);

  const filter = filterProp ?? storeFilter;
  const setFilter = onFilterChange ?? storeSetFilter;
  const clearFilters = onClearFilters ?? storeClearFilters;
  const clearCalls = clearCallsProp ?? storeClearCalls;

  const hasActiveFilters = filter.search || filter.methods.size > 0 || filter.statusCodes.size > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search URL, host, method, body..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          className="flex-1"
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {setSitemapVisible && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => setSitemapVisible(!sitemapVisible)}
              title="Toggle Sitemap"
              className='text-xs text-muted-foreground'
            >
              <Map className="h3 w-3"/>
              {sitemapVisible ? (
                "Sitemap hide"
              ) : (
                "Sitemap show"
              )}
              
            </Button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filter by:</span>
            <div className="flex gap-1">
              {METHOD_FILTERS.map(method => (
                <button
                  key={method}
                  onClick={() => toggleMethod(method)}
                  className={`text-xs px-2 py-1 cursor-pointer rounded-md border transition-colors ${
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
                  className={`text-xs px-2 py-1 rounded-md border cursor-pointer transition-colors ${
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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="xs" onClick={clearCalls} className='text-xs text-muted-foreground'>
              <Trash2 className="h-3 w-3" />
              Clear All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}