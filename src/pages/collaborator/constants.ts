import type { CollaboratorSubTab } from './types';

interface SubTabDef {
  id: CollaboratorSubTab;
  label: string;
}

export const COLLABORATOR_SUB_TABS: SubTabDef[] = [
  { id: 'payloads', label: 'Payloads' },
  { id: 'interactions', label: 'Interactions' },
  { id: 'settings', label: 'Settings' },
];
