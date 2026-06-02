import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface TreeNodeData<TMeta = unknown> {
  id: string;
  type: string;
  label: string;
  description?: string;
  fullPath?: string;
  method?: string;
  status?: number | string;
  children: TreeNodeData<TMeta>[];
  count?: number;
  methods?: string[];
  icon?: LucideIcon;
  iconClassName?: string;
  badge?: ReactNode;
  meta?: TMeta;
}

export interface TreeViewProps<TMeta = unknown> {
  nodes: TreeNodeData<TMeta>[];
  selectedId: string | null;
  onSelectNode?: (node: TreeNodeData<TMeta>) => void;
  onSelectEndpoint?: (node: TreeNodeData<TMeta>) => void;
  onSelectHost?: (node: TreeNodeData<TMeta>) => void;
  defaultExpandedIds?: string[];
  className?: string;
  isLoading?: boolean;
  loadError?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  errorTitle?: string;
}
