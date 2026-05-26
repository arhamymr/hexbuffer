'use client';

import { useState } from 'react';
import { X, Trash2, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { useHistoryQuery } from '@/pages/live-traffic/hooks/use-history-query';
import type { HistoryMode } from '@/pages/live-traffic/hooks/use-http-history-page';
import { TargetSelectorDialog } from '../target-selector';

interface LogFiltersProps {
  filter?: HistoryFilterState;
  onFilterChange?: (filter: HistoryFilterState) => void;
  onClearFilters?: () => void;
  clearCalls?: () => void;
  historyMode?: HistoryMode;
  setHistoryMode?: (mode: HistoryMode) => void;
  sitemapVisible?: boolean;
  setSitemapVisible?: (visible: boolean) => void;
}

export function LogFilters({
  filter: filterProp,
  onFilterChange,
  onClearFilters,
  clearCalls: clearCallsProp,
  historyMode = 'http',
  setHistoryMode,
  sitemapVisible = true,
  setSitemapVisible,
}: LogFiltersProps) {
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const {
    filter: storeFilter,
    setFilter: storeSetFilter,
    toggleMethod,
    toggleStatus,
    clearFilters: storeClearFilters,
    setSelectedCallId: storeSetSelectedCallId,
    triggerRefresh,
  } = useHistoryQuery();

  const filter = filterProp ?? storeFilter;
  const setFilter = onFilterChange ?? storeSetFilter;
  const clearFilters = onClearFilters ?? storeClearFilters;
  const clearCalls = clearCallsProp ?? (async () => {
    await clearHistoryLogs();
    storeSetSelectedCallId(null);
    triggerRefresh();
  });

  const hasActiveFilters =
    filter.search || filter.pathFilter || filter.methods.size > 0 || filter.statusCodes.size > 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <TargetSelectorDialog />
        <Input
          placeholder="Search URL, host, method, body..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          className="flex-1 h-8 shadow-none"
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="xs" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
        {setHistoryMode && (
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className={historyMode === 'http' ? 'font-medium' : 'text-muted-foreground'}>
              HTTP
            </span>
            <Switch
              checked={historyMode === 'websocket'}
              onCheckedChange={(checked) => setHistoryMode(checked ? 'websocket' : 'http')}
              aria-label="Switch between HTTP and WebSocket history"
            />
            <span className={historyMode === 'websocket' ? 'font-medium' : 'text-muted-foreground'}>
              WebSocket
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {historyMode === 'http' && setSitemapVisible && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => setSitemapVisible(!sitemapVisible)}
              title="Toggle Sitemap"
              className='text-xs text-muted-foreground'
            >
              <Map className="h3 w-3"/>
              {sitemapVisible ? "Sitemap hide" : "Sitemap show"}
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filter by:</span>
              <div className="flex gap-1">
                {METHOD_FILTERS.map((method) => (
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
                {STATUS_FILTERS.map((status) => (
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
            <p className='text-muted-foreground'>|</p>
            <Button variant="outline" size="xs" onClick={() => setClearDialogOpen(true)} className='text-xs text-muted-foreground'>
              <Trash2 className="h-3 w-3" />
              Clear All
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Logs?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all logged HTTP requests and responses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearCalls}>Clear All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
