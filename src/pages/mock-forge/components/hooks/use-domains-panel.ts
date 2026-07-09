import { useState } from 'react';
import type { MockDomain } from '../../types';

export function useDomainsPanel(domains: MockDomain[]) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDomains = domains.filter((d) =>
    d.hostname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return { searchQuery, setSearchQuery, filteredDomains };
}
