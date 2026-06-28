import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { setBrowserSearch } from '@/triggers';
import { SearchInput } from './search-input';
import { useDebouncedSearch } from './use-debounced-search';

export function BrowserAutomationSearch() {
  const browserSearch = useBrowserAutomationStore(
    (s) => (s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0] ?? null)?.search ?? '',
  );
  const { localVal, handleChange } = useDebouncedSearch(browserSearch, setBrowserSearch);

  return (
    <SearchInput value={localVal} onChange={handleChange} placeholder="MagnifyingGlass pages, logs, insights…" />
  );
}
