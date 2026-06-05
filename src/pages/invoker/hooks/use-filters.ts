import * as React from 'react';
import { useInvokerStore } from '@/stores/invoker';
import { filterResults } from '../lib/utils';

export function useInvokerFilters() {
  const activeTab = useInvokerStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const results = activeTab?.results ?? [];
  const filterStatus = activeTab?.filterStatus ?? '';
  const filterPayload = activeTab?.filterPayload ?? '';

  const setFilterStatus = useInvokerStore((s) => s.setFilterStatus);
  const setFilterPayload = useInvokerStore((s) => s.setFilterPayload);
  const clearResults = useInvokerStore((s) => s.clearResults);

  const filteredResults = React.useMemo(
    () => filterResults(results, { status: filterStatus, payload: filterPayload }),
    [filterPayload, filterStatus, results]
  );

  return {
    filterStatus,
    filterPayload,
    resultsCount: results.length,
    filteredResults,
    setFilterStatus,
    setFilterPayload,
    clearResults,
  };
}
