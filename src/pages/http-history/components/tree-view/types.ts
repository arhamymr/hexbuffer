export interface TreeNodeData {
  id: string;
  type: 'host' | 'path' | 'endpoint';
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
  selectedId: string | null;
}
