'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2 } from 'lucide-react';
import { useInvokerFilters } from '../hooks/use-filters';

export function InvokerFilters() {
  const {
    filterSearch,
    resultsCount,
    setFilterSearch,
    clearResults,
  } = useInvokerFilters();

  return (
    <div className="mb-2 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search status or payload..."
          className="h-8 pl-8 text-sm"
          value={filterSearch}
          onChange={(event) => setFilterSearch(event.target.value)}
        />
      </div>
      <div className="flex-1" />
      <Button variant="outline" size="xs" onClick={clearResults} disabled={resultsCount === 0}>
        <Trash2 className="h-4 w-4 mr-1" />
        Clear
      </Button>
    </div>
  );
}
