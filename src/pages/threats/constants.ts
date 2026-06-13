import type { PageTabItem } from '@/components/tabs-layout/types';

export const THREAT_TABS: PageTabItem[] = [
  { id: 'overview', name: 'Overview' },
  { id: 'strings', name: 'Strings' },
  { id: 'imports', name: 'Imports' },
  { id: 'functions', name: 'Functions' },
  { id: 'decompiled', name: 'Decompiled Code' },
  { id: 'callgraph', name: 'Call Graph' },
  { id: 'yara', name: 'YARA' },
  { id: 'mitre', name: 'MITRE ATT&CK' },
  { id: 'ai', name: 'AI Analysis' },
];
