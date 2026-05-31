export interface TreeNodeData {
  id: string;
  type: 'host' | 'endpoint';
  label: string;
  fullPath?: string;
  method?: string;
  status?: number;
  children: TreeNodeData[];
  count?: number;
  methods?: string[];
}

export interface TreeViewProps {
  onSelectEndpoint: (node: TreeNodeData) => void;
  onSelectHost: (node: TreeNodeData) => void;
  selectedId: string | null;
}
