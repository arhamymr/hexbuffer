export interface PageTabItem {
  id: string;
  name: string;
  disabled?: boolean;
  closable?: boolean;
  status?: {
    kind: 'running' | 'needs-action' | 'ready';
    label: string;
  };
}
