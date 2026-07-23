import { useWebSocketHistoryQueryStore } from '@/stores/history';
import { SearchInput } from './search-input';
import { useDebouncedSearch } from './use-debounced-search';

export function WebSocketHistorySearch() {
  const search = useWebSocketHistoryQueryStore((s) => s.filter.search);
  const setSearch = useWebSocketHistoryQueryStore((s) => s.setSearch);
  const { localVal, handleChange } = useDebouncedSearch(search, setSearch);

  return (
    <SearchInput value={localVal} onChange={handleChange} placeholder="Search URL, host, path…" />
  );
}
