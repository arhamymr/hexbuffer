import type { PageTabItem } from '@/components/tabs-layout/tab-bar';

export const TOOLS_TABS: PageTabItem[] = [
  { id: 'codec', name: 'Encoder / Decoder' },
  { id: 'graphql', name: 'GraphQL' },
  { id: 'hash', name: 'Hash' },
  { id: 'subdomain', name: 'Subdomain' },
  { id: 'ports', name: 'Port Scanner' },
  { id: 'fuzz', name: 'Fuzz Scanner' },
  { id: 'sqli', name: 'SQL Injection' },
  { id: 'utils', name: 'Others' },
];
