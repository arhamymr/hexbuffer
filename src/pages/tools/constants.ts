import type { PageTabItem } from '@/components/tabs-layout/tab-bar';

export const TOOLS_TABS: PageTabItem[] = [
  { id: 'codec', name: 'Encoder / Decoder' },
  { id: 'hash', name: 'Hash' },
  { id: 'compare', name: 'Comparer' },
  { id: 'ports', name: 'Port Scanner' },
  { id: 'shell', name: 'Script Analyzer' },
  { id: 'jwt', name: 'JWT' },
  { id: 'xss', name: 'XSS Generator' },
  // { id: 'sqli', name: 'SQL Injection' },
  // { id: 'utils', name: 'Others' },
];
