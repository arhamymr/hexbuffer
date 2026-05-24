import * as React from 'react';
import { useBruteForceStore } from '@/stores/bruto-force';
import { filterResults } from '../lib/utils';

export function useBruteForceFilters() {
  const activeTab = useBruteForceStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const results = activeTab?.results ?? [];
  const filterStatus = activeTab?.filterStatus ?? '';
  const filterPayload = activeTab?.filterPayload ?? '';
  const filterGrep = activeTab?.filterGrep ?? false;

  const setFilterStatus = useBruteForceStore((s) => s.setFilterStatus);
  const setFilterPayload = useBruteForceStore((s) => s.setFilterPayload);
  const setFilterGrep = useBruteForceStore((s) => s.setFilterGrep);
  const clearResults = useBruteForceStore((s) => s.clearResults);

  const filteredResults = React.useMemo(
    () => filterResults(results, { status: filterStatus, payload: filterPayload, grepOnly: filterGrep }),
    [filterGrep, filterPayload, filterStatus, results]
  );

  return {
    filterStatus,
    filterPayload,
    filterGrep,
    resultsCount: results.length,
    filteredResults,
    setFilterStatus,
    setFilterPayload,
    setFilterGrep,
    clearResults,
  };
}
