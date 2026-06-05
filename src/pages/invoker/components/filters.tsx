'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { useInvokerFilters } from '../hooks/use-filters';

export function InvokerFilters() {
  const {
    filterStatus,
    filterPayload,
    resultsCount,
    setFilterStatus,
    setFilterPayload,
    clearResults,
  } = useInvokerFilters();

  return (
    <div className="mb-2 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Label className="text-xs">Status:</Label>
        <Input
          placeholder="Filter by status..."
          className="h-8 text-sm"
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs">Payload:</Label>
        <Input
          placeholder="Filter by payload..."
          className="h-8 text-sm"
          value={filterPayload}
          onChange={(event) => setFilterPayload(event.target.value)}
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
