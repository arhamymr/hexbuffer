import { useNavStore } from '@/stores/nav';
import { SearchInput } from './search-input';
import { useDebouncedSearch } from './use-debounced-search';

export function DesktopSearch() {
  const desktopSearch = useNavStore((s) => s.desktopSearchQuery);
  const setDesktopSearch = useNavStore((s) => s.setDesktopSearchQuery);
  const { localVal, handleChange } = useDebouncedSearch(desktopSearch, setDesktopSearch);

  return (
    <SearchInput value={localVal} onChange={handleChange} placeholder="Search features…" />
  );
}
