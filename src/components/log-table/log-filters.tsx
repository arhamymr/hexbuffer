'use client';

import {  X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FilterState } from './types';
import { METHOD_FILTERS, STATUS_FILTERS } from '@/components/log-table/utils';
import type { ApiCall } from '@/types';

interface LogFiltersProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  onClearFilters: () => void;
  filteredLogs: ApiCall[];
  calls: ApiCall[];
  clearCalls: () => void;
  toggleMethod?: (method: string) => void;
  toggleStatus?: (status: string) => void;
}

export function LogFilters({ filter, onFilterChange, onClearFilters, filteredLogs, calls, clearCalls, toggleMethod, toggleStatus }: LogFiltersProps) {
  const hasActiveFilters = filter.search || filter.methods.size > 0 || filter.statusCodes.size > 0;

  const handleToggleMethod = toggleMethod || ((method: string) => {
    const next = new Set(filter.methods);
    if (next.has(method)) {
      next.delete(method);
    } else {
      next.add(method);
    }
    onFilterChange({ ...filter, methods: next });
  });

  const handleToggleStatus = toggleStatus || ((status: string) => {
    const next = new Set(filter.statusCodes);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    onFilterChange({ ...filter, statusCodes: next });
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        
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

      <div className="flex items-center  justify-between gap-4">
        <div className='flex items-center gap-3'>
<div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filter by:</span>
          <div className="flex gap-1">
            {METHOD_FILTERS.map(method => (
              <button
                key={method}
                onClick={() => handleToggleMethod(method)}
                className={`text-xs px-2 py-1 cursor-pointer rounded border transition-colors ${
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
                onClick={() => handleToggleStatus(status.label)}
                className={`text-xs px-2 py-1 rounded border cursor-pointer transition-colors ${
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
          <div className="text-sm text-muted-foreground mr-4">
            {filteredLogs.length} / {calls.length} requests
          </div>
          <Button variant="outline" size="xs" onClick={clearCalls}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>
      </div>
   
    </div>
  );
}
