import { useHistoryQueryStore } from '@/pages/live-traffic/state/history-query-store';
import { SearchInput } from './search-input';
import { useDebouncedSearch } from './use-debounced-search';

export function LiveTrafficSearch() {
  const liveSearch = useHistoryQueryStore((s) => s.filter.search);
  const liveSetSearch = useHistoryQueryStore((s) => s.setSearch);
  const { localVal, handleChange } = useDebouncedSearch(liveSearch, liveSetSearch);

  return (
    <SearchInput value={localVal} onChange={handleChange} placeholder="Search URL, host, method, body…" />
  );
}
