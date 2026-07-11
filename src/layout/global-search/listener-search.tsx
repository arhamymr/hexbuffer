import { useListenerStore } from '@/stores/listener';
import { SearchInput } from './search-input';
import { useDebouncedSearch } from './use-debounced-search';

export function ListenerSearch() {
  const search = useListenerStore((s) => s.search);
  const setSearch = useListenerStore((s) => s.setSearch);
  const { localVal, handleChange } = useDebouncedSearch(search, setSearch);

  return (
    <SearchInput
      value={localVal}
      onChange={handleChange}
      placeholder="Search type, IP, method, path, payload…"
    />
  );
}
