import { useState } from 'react';
import { X, Trash } from 'lucide-react';
import { CrawlStatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { METHOD_FILTERS, STATUS_FILTERS } from './utils';
import { clearHistoryLogs } from '@/pages/live-traffic/services/history-service';
import type { HistoryFilterState } from '@/pages/live-traffic/state/history-query-store';
import { useHistoryQueryStore } from '@/pages/live-traffic/state/history-query-store';
import { useShallow } from 'zustand/react/shallow';

interface LogFiltersProps {
  filter?: HistoryFilterState;
  onFilterChange?: (filter: HistoryFilterState) => void;
  onClearFilters?: () => void;
  clearCalls?: () => void;
  historyMode?: 'http' | 'websocket';
}

export function LogFilters({
  filter: filterProp,
  onFilterChange,
  onClearFilters,
  clearCalls: clearCallsProp,
  historyMode: historyModeProp,
}: LogFiltersProps) {
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const isStreamManuallyPaused = useHistoryQueryStore((s) => s.isStreamManuallyPaused);

  const historyMode = historyModeProp ?? (typeof window !== 'undefined' ? (localStorage.getItem('history-mode') as 'http' | 'websocket' | null) ?? 'http' : 'http');

  const {
    filter: storeFilter,
    clearFilters: storeClearFilters,
    triggerRefresh,
    setSelectedCallId: storeSetSelectedCallId,
  } = useHistoryQueryStore(
    useShallow((state) => ({
      filter: state.filter,
      clearFilters: state.clearFilters,
      triggerRefresh: state.triggerRefresh,
      setSelectedCallId: state.setSelectedCallId,
    }))
  );

  const setFilter = onFilterChange ?? useHistoryQueryStore.getState().setFilter;
  const filter = filterProp ?? storeFilter;
  const clearFilters = onClearFilters ?? storeClearFilters;
  const clearCalls = clearCallsProp ?? (async () => {
    await clearHistoryLogs();
    storeSetSelectedCallId(null);
    triggerRefresh();
  });

  const hasActiveFilters =
    filter.search || filter.pathFilter || filter.methods.size > 0 || filter.statusCodes.size > 0;

  return (
    <div className="bg-muted p-1 px-2">
      <div className="flex items-center gap-2 justify-between w-full">
          <div className='flex gap-2 items-center'>
            <span className="text-xs text-muted-foreground">Method:</span>
            <ToggleGroup
              type="multiple"
              variant="outline"
              size="sm"
              value={Array.from(filter.methods)}
              onValueChange={(values) =>
                setFilter({ ...filter, methods: new Set(values) })
              }
              className="bg-background cursor-pointer"
            >
              {METHOD_FILTERS.map((method) => (
                <ToggleGroupItem key={method} value={method}>
                  {method}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <span className="text-xs text-muted-foreground">Status:</span>
            <ToggleGroup
              type="multiple"
              variant="outline"
              size="sm"
              value={Array.from(filter.statusCodes)}
              onValueChange={(values) =>
                setFilter({ ...filter, statusCodes: new Set(values) })
              }
              className="text-[10px] bg-background cursor-pointer"
            >
              {STATUS_FILTERS.map((status) => (
                <ToggleGroupItem key={status.label} value={status.label}>
                  {status.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

<div className='flex gap-2 items-center'>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {historyMode === 'http' ? 'HTTP' : 'WebSocket'}
          </span>
 {isStreamManuallyPaused && (
            <CrawlStatusBadge status="paused" />
          )}
          
          {hasActiveFilters && (
            <Button variant="destructive" size="sm" className="h-6 shrink-0" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}


          <Button variant="ghost" size="sm" onClick={() => setClearDialogOpen(true)} className="text-xs !text-red-500 shrink-0">
            <Trash className="size-3 mb-0.5" />
            Clear All History
          </Button>


          
</div>
         
        </div>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All History ?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all logged history requests and responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={clearCalls}>Clear All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
