'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Trash2 } from 'lucide-react';

interface BruteForceFiltersProps {
  filterStatus: string;
  filterPayload: string;
  filterGrep: boolean;
  resultsCount: number;
  onFilterStatusChange: (value: string) => void;
  onFilterPayloadChange: (value: string) => void;
  onFilterGrepChange: (value: boolean) => void;
  onExport: (format: 'csv' | 'json') => void;
  onClear: () => void;
}

export function BruteForceFilters({
  filterStatus,
  filterPayload,
  filterGrep,
  resultsCount,
  onFilterStatusChange,
  onFilterPayloadChange,
  onFilterGrepChange,
  onExport,
  onClear,
}: BruteForceFiltersProps) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Label className="text-xs">Status:</Label>
        <Input
          placeholder="Filter by status..."
          className="h-8 w-24 text-sm"
          value={filterStatus}
          onChange={(event) => onFilterStatusChange(event.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs">Payload:</Label>
        <Input
          placeholder="Filter by payload..."
          className="h-8 w-40 text-sm"
          value={filterPayload}
          onChange={(event) => onFilterPayloadChange(event.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="filterGrep"
          checked={filterGrep}
          onCheckedChange={(checked) => onFilterGrepChange(checked as boolean)}
        />
        <Label htmlFor="filterGrep" className="text-xs cursor-pointer">
          Grep Match Only
        </Label>
      </div>
      <div className="flex-1" />
      <Button variant="outline" size="xs" onClick={() => onExport('csv')} disabled={resultsCount === 0}>
        <Download className="h-4 w-4 mr-1" />
        CSV
      </Button>
      <Button variant="outline" size="xs" onClick={() => onExport('json')} disabled={resultsCount === 0}>
        <Download className="h-4 w-4 mr-1" />
        JSON
      </Button>
      <Button variant="outline" size="xs" onClick={onClear} disabled={resultsCount === 0}>
        <Trash2 className="h-4 w-4 mr-1" />
        Clear
      </Button>
    </div>
  );
}
