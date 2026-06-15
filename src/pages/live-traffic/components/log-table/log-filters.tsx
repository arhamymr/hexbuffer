'use client';

import { useState } from 'react';
import { Pause, Play, X, Search, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { HistoryMode } from '@/pages/live-traffic/hooks/use-http-history-page';
import { TargetSelectorDialog } from '../target-selector';

interface LogFiltersProps {
  filter?: HistoryFilterState;
  onFilterChange?: (filter: HistoryFilterState) => void;
  onClearFilters?: () => void;
  clearCalls?: () => void;
  historyMode?: HistoryMode;
  setHistoryMode: (mode: HistoryMode) => void;
}

export function LogFilters({
  filter: filterProp,
  onFilterChange,
  onClearFilters,
  clearCalls: clearCallsProp,
  historyMode = 'http',
  setHistoryMode,
}: LogFiltersProps) {
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const {
    filter: storeFilter,
    setSearch: storeSetSearch,
    clearFilters: storeClearFilters,
    isStreamManuallyPaused,
    setStreamManuallyPaused,
    triggerRefresh,
    setSelectedCallId: storeSetSelectedCallId,
  } = useHistoryQueryStore(
    useShallow((state) => ({
      filter: state.filter,
      setSearch: state.setSearch,
      clearFilters: state.clearFilters,
      isStreamManuallyPaused: state.isStreamManuallyPaused,
      setStreamManuallyPaused: state.setStreamManuallyPaused,
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
    <div className="space-y-1 p-1 bg-muted">
      <div className="relative flex items-center gap-2">
        <TargetSelectorDialog />
        <div className='relative flex items-center w-full'>
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            placeholder="Search URL, host, method, body..."
            value={filter.search}
            onChange={(e) => storeSetSearch(e.target.value)}
            className="pl-8 flex-1 w-full shadow-none bg-background"
          />
        </div>

        {hasActiveFilters && (
          <Button variant="destructive" size="xs" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}

        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={historyMode}
          onValueChange={(val) => val && setHistoryMode(val as HistoryMode)}
          className="ml-auto bg-background cursor-pointer"
        >
          <ToggleGroupItem value="http">HTTP</ToggleGroupItem>
          <ToggleGroupItem value="websocket">WebSocket</ToggleGroupItem>
        </ToggleGroup>


        {historyMode === 'http' && (
          <Button
            variant={isStreamManuallyPaused ? 'default' : 'outline'}
            size="xs"
            onClick={() => setStreamManuallyPaused(!isStreamManuallyPaused)}
            className="text-xs"
            title={isStreamManuallyPaused ? 'Resume live HTTP updates' : 'Pause live HTTP updates'}
          >
            {isStreamManuallyPaused ? (
              <Play className="h-3 w-3" />
            ) : (
              <Pause className="h-3 w-3" />
            )}
            {isStreamManuallyPaused ? 'Resume' : 'Pause'}
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="xs" onClick={() => setClearDialogOpen(true)} className='text-xs !text-red-500 text-muted-foreground'>
          <Trash className="size-3 mb-0.5" />
          Clear All History
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
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
            </div>

            <div className="flex items-center gap-2">
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

          </div>
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
