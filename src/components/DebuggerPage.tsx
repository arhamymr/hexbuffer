'use client';

import { useState, useMemo } from 'react';
import { Bug, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTrafficStore, useFilteredCalls } from '@/stores/trafficStore';
import type { FilterState } from './types';
import { STATUS_FILTERS } from './constants';
import { DEFAULT_FILTER_STATE } from './types';
import { LogEntry } from './LogEntry';
import { LogFilters } from './LogFilters';
import { EmptyState } from './EmptyState';

export function DebuggerPage() {
  const calls = useTrafficStore((s) => s.calls);
  const clearCalls = useTrafficStore((s) => s.clearCalls);
  const filteredCalls = useFilteredCalls();

  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const toggleExpanded = (id: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredLogs = useMemo(() => {
    return filteredCalls.filter((log) => {
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
  }, [filteredCalls, filter]);

  const clearFilters = () => {
    setFilter(DEFAULT_FILTER_STATE);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Bug className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Event Debugger</h1>
            <p className="text-sm text-muted-foreground">Real-time traffic log</p>
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

      <LogFilters filter={filter} onFilterChange={setFilter} onClearFilters={clearFilters} />

      <Card className="flex-1 flex flex-col overflow-hidden mt-3">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-base">Traffic Log</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {filteredLogs.length === 0 ? (
            <EmptyState variant={calls.length === 0 ? 'no-traffic' : 'no-matches'} />
          ) : (
            <ScrollArea className="h-full">
              {[...filteredLogs].reverse().map((log) => (
                <LogEntry
                  key={log.id}
                  call={log}
                  expanded={expandedLogs.has(log.id)}
                  onToggle={() => toggleExpanded(log.id)}
                />
              ))}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}