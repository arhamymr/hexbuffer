import type { ListenerSubTab } from './types';

interface SubTabDef {
  id: ListenerSubTab;
  label: string;
}

export const LISTENER_SUB_TABS: SubTabDef[] = [
  { id: 'hosts', label: 'Hosts' },
  { id: 'interactions', label: 'Interactions' },
];
