'use client';

import { useState, useMemo } from 'react';
import { useTrafficStore } from '@/stores/trafficStore';
import type { Target } from '@/types';
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
import type { ApiCall } from '@/types';

function filterByScope(calls: ApiCall[], scope: string[]): ApiCall[] {
  if (scope.length === 0) return calls;
  return calls.filter((call) => {
    if (!call.host) return true;
    return matchesScope(call.host, scope);
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

export function ProxyTabContent({
  target,
  targets,
  filterMode,
  onFilterModeChange,
  clearLogs,
  onTargetsUpdated,
}: ProxyTabContentProps) {
  const calls = useTrafficStore((s) => s.calls);

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

  const scopePatterns = target?.scope || [];

  const filteredCalls = useMemo(() => {
    let result = calls;

    if (filterMode === 'scoped' && scopePatterns.length > 0) {
      result = filterByScope(result, scopePatterns);
    }

    result = result.filter((call) => {
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matchesSearch =
          call.url?.toLowerCase().includes(searchLower) ||
          call.host?.toLowerCase().includes(searchLower) ||
          call.method?.toLowerCase().includes(searchLower) ||
          call.request_body?.toLowerCase().includes(searchLower) ||
          call.response_body?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (filter.methods.size > 0 && call.method) {
        if (!filter.methods.has(call.method.toUpperCase())) return false;
      }

      if (filter.statusCodes.size > 0 && call.response_status) {
        let matchesStatus = false;
        for (const code of filter.statusCodes) {
          const range = STATUS_FILTERS.find((f) => f.label === code);
          if (range && call.response_status >= range.min && call.response_status <= range.max) {
            matchesStatus = true;
            break;
          }
        }
        if (!matchesStatus) return false;
      }

      return true;
    });

    return result;
  }, [calls, filter, filterMode, scopePatterns]);

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
                {filteredCalls.length} / {calls.length} logs
              </div>
              <Button variant="outline" size="sm" onClick={clearLogs}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {filteredCalls.length === 0 ? (
            <EmptyState variant={calls.length === 0 ? 'no-traffic' : 'no-matches'} />
          ) : (
            <div className="h-full overflow-auto">
              {[...filteredCalls].reverse().map((call) => (
                <LogEntry
                  key={call.id}
                  call={call}
                  expanded={expandedLogs.has(call.id)}
                  onToggle={() => toggleExpanded(call.id)}
                  activeTargetId={target.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}