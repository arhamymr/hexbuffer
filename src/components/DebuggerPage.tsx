'use client';

import { useState, useMemo } from 'react';
import { Bug, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTrafficStore } from '@/stores/trafficStore';
import type { DebugLog, ProxyLogEntry } from '@/stores/trafficStore';
import type { FilterState } from './types';
import { STATUS_FILTERS } from './constants';
import { DEFAULT_FILTER_STATE } from './types';
import { LogEntry } from './LogEntry';
import { LogFilters } from './LogFilters';
import { EmptyState } from './EmptyState';

export function DebuggerPage() {
  const logs = useTrafficStore((state) => state.logs);
  const clearLogs = useTrafficStore((state) => state.clearLogs);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const toggleExpanded = (id: string) => {
    setExpandedLogs(prev => {
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
    return logs.filter(log => {
      if (log.type !== 'proxy-log') return true;

      const data = log.data as ProxyLogEntry;

      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matchesSearch =
          data.url?.toLowerCase().includes(searchLower) ||
          data.host?.toLowerCase().includes(searchLower) ||
          data.method?.toLowerCase().includes(searchLower) ||
          data.request_body?.toLowerCase().includes(searchLower) ||
          data.response_body?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (filter.methods.size > 0 && data.method) {
        if (!filter.methods.has(data.method.toUpperCase())) return false;
      }

      if (filter.statusCodes.size > 0 && data.status) {
        let matchesStatus = false;
        for (const code of filter.statusCodes) {
          const range = STATUS_FILTERS.find(f => f.label === code);
          if (range && data.status >= range.min && data.status <= range.max) {
            matchesStatus = true;
            break;
          }
        }
        if (!matchesStatus) return false;
      }

      return true;
    });
  }, [logs, filter]);

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
            <p className="text-sm text-muted-foreground">Real-time proxy traffic log</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground mr-4">
            {filteredLogs.length} / {logs.length} logs
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearLogs}
          >
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
            <EmptyState variant={logs.length === 0 ? 'no-traffic' : 'no-matches'} />
          ) : (
            <ScrollArea className="h-full">
              {[...filteredLogs].reverse().map((log) => (
                <LogEntry
                  key={log.id}
                  log={log}
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
