import { useHttpHistoryQueryStore } from '@/pages/http-history/state/history-query-store';
import { SearchInput } from './search-input';
import { useDebouncedSearch } from './use-debounced-search';

export function HttpHistorySearch() {
  const search = useHttpHistoryQueryStore((s) => s.filter.search);
  const setSearch = useHttpHistoryQueryStore((s) => s.setSearch);
  const { localVal, handleChange } = useDebouncedSearch(search, setSearch);

  return (
    <SearchInput value={localVal} onChange={handleChange} placeholder="Search URL, host, method, body…" />
  );
}
