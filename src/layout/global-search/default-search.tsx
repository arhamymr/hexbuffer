import * as React from 'react';
import { SearchInput } from './search-input';

export function DefaultSearch() {
  const [localVal, setLocalVal] = React.useState('');
  return (
    <SearchInput value={localVal} onChange={setLocalVal} placeholder="Search pages…" />
  );
}
