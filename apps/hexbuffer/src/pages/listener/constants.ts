import type { ListenerSubTab } from './types';

interface SubTabDef {
  id: ListenerSubTab;
  label: string;
}

export const LISTENER_SUB_TABS: SubTabDef[] = [
  { id: 'payloads', label: 'Payloads' },
  { id: 'interactions', label: 'Interactions' },
  { id: 'settings', label: 'Settings' },
];
