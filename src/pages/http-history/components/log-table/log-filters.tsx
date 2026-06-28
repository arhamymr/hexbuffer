import { useState } from 'react';
import { XIcon, TrashIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { CrawlStatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { METHOD_FILTERS, STATUS_FILTERS } from './utils';
import { clearHistoryLogs } from '@/pages/http-history/services/history-service';
import type { HistoryFilterState } from '@/pages/http-history/state/history-query-store';
import { useHttpHistoryQueryStore } from '@/pages/http-history/state/history-query-store';
import { useBlacklistStore } from '@/pages/http-history/state/blacklist-store';
import { useHighlightStore } from '@/pages/http-history/state/highlight-store';
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
  const [isClearing, setIsClearing] = useState(false);
  const isStreamManuallyPaused = useHttpHistoryQueryStore((s) => s.isStreamManuallyPaused);

  const historyMode = historyModeProp ?? (typeof window !== 'undefined' ? (localStorage.getItem('history-mode') as 'http' | 'websocket' | null) ?? 'http' : 'http');

  const {
    filter: storeFilter,
    clearFilters: storeClearFilters,
    triggerRefresh,
    setSelectedCallId: storeSetSelectedCallId,
  } = useHttpHistoryQueryStore(
    useShallow((state) => ({
      filter: state.filter,
      clearFilters: state.clearFilters,
      triggerRefresh: state.triggerRefresh,
      setSelectedCallId: state.setSelectedCallId,
    }))
  );

  const setFilter = onFilterChange ?? useHttpHistoryQueryStore.getState().setFilter;
  const filter = filterProp ?? storeFilter;
  const clearFilters = onClearFilters ?? storeClearFilters;

  const clearCalls = clearCallsProp ?? (async () => {
    setIsClearing(true);
    try {
      await clearHistoryLogs();
      storeSetSelectedCallId(null);
      triggerRefresh();
      await new Promise((r) => setTimeout(r, 3000));
      toast.success('History cleared successfully');
    } catch {
      toast.error('Failed to clear history');
    } finally {
      setIsClearing(false);
      setClearDialogOpen(false);
    }
  });

  const hasActiveFilters =
    filter.search || filter.pathFilter || filter.methods.size > 0 || filter.statusCodes.size > 0;

  const blacklistRules = useBlacklistStore((s) => s.rules);
  const removeBlacklistRule = useBlacklistStore((s) => s.removeRule);

  const highlightedHosts = useHighlightStore((s) => s.highlightedHosts);
  const removeHighlight = useHighlightStore((s) => s.removeHighlight);

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
              <XIcon className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}


          <Button variant="ghost" size="sm" onClick={() => setClearDialogOpen(true)} className="text-xs !text-red-500 shrink-0">
            <TrashIcon className="size-3 mb-0.5" />
            Clear All History
          </Button>
        </div>
      </div>

      {blacklistRules.length > 0 && (
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[10px] text-muted-foreground shrink-0">Hidden:</span>
          {blacklistRules.map((rule) => (
            <span
              key={rule.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[10px] text-red-600 dark:text-red-400"
            >
              <span className="max-w-[200px] truncate">
                {rule.host}{rule.path ? rule.path : '/*'}
              </span>
              <button
                className="ml-0.5 hover:text-red-800 dark:hover:text-red-200 shrink-0"
                onClick={() => removeBlacklistRule(rule.id)}
                title="Remove blacklist rule"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {Object.keys(highlightedHosts).length > 0 && (
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[10px] text-muted-foreground shrink-0">Highlights:</span>
          {Object.entries(highlightedHosts).map(([key, color]) => {
            const separatorIdx = key.indexOf('|');
            const host = separatorIdx >= 0 ? key.slice(0, separatorIdx) : key;
            const path = separatorIdx >= 0 ? key.slice(separatorIdx + 1) : '';
            const display = path ? `${host}${path}` : host;
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px]"
                style={{ backgroundColor: `${color}15`, borderColor: `${color}40`, color }}
              >
                <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="max-w-[200px] truncate">{display}</span>
                <button
                  className="ml-0.5 opacity-60 hover:opacity-100 shrink-0"
                  onClick={() => removeHighlight(host, path)}
                  title="Remove highlight"
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All History ?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all logged history requests and responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isClearing}
              onClick={clearCalls}
            >
              {isClearing ? (
                <>
                  <SpinnerGapIcon className="mr-1 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Clear All'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
