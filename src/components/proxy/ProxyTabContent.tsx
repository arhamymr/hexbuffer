'use client';

import { useState, useMemo } from 'react';
import { useTrafficStore } from '@/stores/trafficStore';
import type { Target } from '@/types';
import type { DebugLog, ProxyLogEntry } from '@/hooks/useDebugLogs';
import type { FilterState } from '@/components/types';
import { DEFAULT_FILTER_STATE } from '@/components/types';
import { STATUS_FILTERS } from '@/components/constants';
import { LogEntry } from '@/components/LogEntry';
import { LogFilters } from '@/components/LogFilters';
import { EmptyState } from '@/components/EmptyState';
import { ProxyHeader } from './ProxyHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FilterMode } from '@/stores/proxyStore';
import { matchesScope } from './ProxyHeader';

function filterLogsByScope(logs: DebugLog[], scope: string[]): DebugLog[] {
  if (scope.length === 0) return logs;

  return logs.filter(log => {
    if (log.type !== 'proxy-log') return true;
    const data = log.data as ProxyLogEntry;
    if (!data.host) return true;
    return matchesScope(data.host, scope);
  });
}

interface ProxyTabContentProps {
  target: Target;
  targets: Target[];
  filterMode: FilterMode;
  onFilterModeChange: (mode: FilterMode) => void;
  clearLogs: () => void;
  onTargetsUpdated: () => void;
}

export function ProxyTabContent({ target, targets, filterMode, onFilterModeChange, clearLogs, onTargetsUpdated }: ProxyTabContentProps) {
  const logs = useTrafficStore((state) => state.logs);

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

  const scopePatterns = target?.scope || [];

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (filterMode === 'scoped' && scopePatterns.length > 0) {
      result = filterLogsByScope(result, scopePatterns);
    }

    result = result.filter(log => {
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

    return result;
  }, [logs, filter, filterMode, scopePatterns]);

  const clearFilters = () => {
    setFilter(DEFAULT_FILTER_STATE);
  };

  return (
    <div className="h-full flex flex-col">
      <ProxyHeader
        target={target}
        targets={targets}
        onTargetsUpdated={onTargetsUpdated}
        filterMode={filterMode}
        onFilterModeChange={onFilterModeChange}
      />

      <LogFilters filter={filter} onFilterChange={setFilter} onClearFilters={clearFilters} />

      <Card className="flex-1 flex flex-col overflow-hidden mt-3">
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Traffic Log</CardTitle>
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
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {filteredLogs.length === 0 ? (
            <EmptyState variant={logs.length === 0 ? 'no-traffic' : 'no-matches'} />
          ) : (
            <div className="h-full overflow-auto">
              {[...filteredLogs].reverse().map((log) => (
                <LogEntry
                  key={log.id}
                  log={log}
                  expanded={expandedLogs.has(log.id)}
                  onToggle={() => toggleExpanded(log.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}