import * as React from 'react';
import { useInvokerStore } from '@/stores/invoker';
import { filterResults } from '../lib/utils';

export function useInvokerFilters() {
  const activeTab = useInvokerStore((s) => s.tabs.find((t) => t.id === s.activeTabId));
  const results = activeTab?.results ?? [];
  const filterSearch = activeTab?.filterSearch ?? '';

  const setFilterSearch = useInvokerStore((s) => s.setFilterSearch);
  const clearResults = useInvokerStore((s) => s.clearResults);

  const filteredResults = React.useMemo(
    () => filterResults(results, filterSearch),
    [filterSearch, results]
  );

  return {
    filterSearch,
    resultsCount: results.length,
    filteredResults,
    setFilterSearch,
    clearResults,
  };
}
