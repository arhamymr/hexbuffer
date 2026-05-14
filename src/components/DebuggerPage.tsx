'use client';

import { useState, useMemo } from 'react';
import { Bug, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useHttpHistoryStore } from '@/stores/http-history';
import type { FilterState } from './log-table/types';
import { STATUS_FILTERS } from '@/components/log-table/utils';
import { DEFAULT_FILTER_STATE } from './log-table/types';
import { TrafficTable } from './log-table/calls-columns';
import { LogFilters } from './log-table/log-filters';
import { EmptyState } from './EmptyState';
import { JsonDetailDrawer } from './log-table/json-detail-drawer';

export function DebuggerPage() {
  const calls = useHttpHistoryStore((s) => s.calls);
  const clearCalls = useHttpHistoryStore((s) => s.clearCalls);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const filteredLogs = useMemo(() => {
    return calls.filter((log) => {
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matchesSearch =
          log.url?.toLowerCase().includes(searchLower) ||
          log.host?.toLowerCase().includes(searchLower) ||
          log.method?.toLowerCase().includes(searchLower) ||
          log.request_body?.toLowerCase().includes(searchLower) ||
          log.response_body?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (filter.methods.size > 0 && log.method) {
        if (!filter.methods.has(log.method.toUpperCase())) return false;
      }

      if (filter.statusCodes.size > 0 && log.response_status) {
        let matchesStatus = false;
        for (const code of filter.statusCodes) {
          const range = STATUS_FILTERS.find((f) => f.label === code);
          if (range && log.response_status >= range.min && log.response_status <= range.max) {
            matchesStatus = true;
            break;
          }
        }
        if (!matchesStatus) return false;
      }

      return true;
    });
  }, [calls, filter]);

  const clearFilters = () => {
    setFilter(DEFAULT_FILTER_STATE);
  };

  const selectedCall = selectedId ? calls.find(c => c.id === selectedId) || null : null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl">Event Debugger</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground mr-4">
            {filteredLogs.length} / {calls.length} logs
          </div>
          <Button variant="outline" size="sm" onClick={clearCalls}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      <LogFilters filter={filter} onFilterChange={setFilter} onClearFilters={clearFilters} filteredLogs={filteredLogs} calls={calls} clearCalls={clearCalls} />

      <Card className="flex-1 flex flex-col overflow-hidden mt-3">
        <CardContent className="flex-1 overflow-hidden p-0">
          {filteredLogs.length === 0 ? (
            <EmptyState variant={calls.length === 0 ? 'no-traffic' : 'no-matches'} />
          ) : (
            <TrafficTable
              calls={[...filteredLogs].reverse()}
              onSelect={setSelectedId}
            />
          )}
        </CardContent>
      </Card>

      <JsonDetailDrawer
        call={selectedCall}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}