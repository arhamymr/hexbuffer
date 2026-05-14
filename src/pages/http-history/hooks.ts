import { useState, useMemo } from 'react';
import { useHttpHistoryStore } from '@/stores/http-history';
import type { ApiCall } from '@/types';
import { STATUS_FILTERS } from '@/components/log-table/utils';
import { FilterState, DEFAULT_FILTER_STATE } from '@/components/log-table/types';

export function useHttpHistory() {
  const calls = useHttpHistoryStore((s) => s.calls);
  const setCalls = useHttpHistoryStore((s) => s.setCalls);
  const clearCalls = useHttpHistoryStore((s) => s.clearCalls);
  return { calls, setCalls, clearCalls };
}


export function useLogFilter() {
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const toggleMethod = (method: string) => {
    const next = new Set(filter.methods);
    if (next.has(method)) {
      next.delete(method);
    } else {
      next.add(method);
    }
    setFilter({ ...filter, methods: next });
  };

  const toggleStatus = (status: string) => {
    const next = new Set(filter.statusCodes);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    setFilter({ ...filter, statusCodes: next });
  };

  const clearFilters = () => {
    setFilter(DEFAULT_FILTER_STATE);
  };

  return { filter, setFilter, toggleMethod, toggleStatus, clearFilters };
}

export function useFilteredCalls(calls: ApiCall[], filter: FilterState) {
  return useMemo(() => {
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
}