import { useNavStore } from '@/stores/nav';
import { SearchInput } from './search-input';
import { useDebouncedSearch } from './use-debounced-search';

export function OverviewSearch() {
  const overviewSearch = useNavStore((s) => s.overviewSearchQuery);
  const setOverviewSearch = useNavStore((s) => s.setOverviewSearchQuery);
  const { localVal, handleChange } = useDebouncedSearch(overviewSearch, setOverviewSearch);

  return (
    <SearchInput value={localVal} onChange={handleChange} placeholder="Search features…" />
  );
}
