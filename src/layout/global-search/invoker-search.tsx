import { useInvokerStore } from '@/stores/invoker';
import { SearchInput } from './search-input';
import { useDebouncedSearch } from './use-debounced-search';

export function InvokerSearch() {
  const invokerSearch = useInvokerStore(
    (s) => s.tabs.find((t) => t.id === s.activeTabId)?.filterSearch ?? '',
  );
  const invokerSetSearch = useInvokerStore((s) => s.setFilterSearch);
  const { localVal, handleChange } = useDebouncedSearch(invokerSearch, invokerSetSearch);

  return (
    <SearchInput value={localVal} onChange={handleChange} placeholder="Search status or payload…" />
  );
}
