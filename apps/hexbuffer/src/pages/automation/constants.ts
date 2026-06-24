import type { AutomationNodeType, NodeCategory } from './types';
export { NODE_TYPE_REGISTRY, type NodeTypeDef } from './node-type-registry';

export const NODE_CATEGORY_GROUPS: { category: NodeCategory; label: string }[] = [
  { category: 'trigger', label: 'Triggers' },
  { category: 'condition', label: 'Conditions' },
  { category: 'action', label: 'Actions' },
];

export const CATEGORY_BORDER: Record<NodeCategory, string> = {
  trigger: 'border-blue-500/50',
  condition: 'border-amber-500/50',
  action: 'border-emerald-500/50',
};

export const CATEGORY_BG: Record<NodeCategory, string> = {
  trigger: 'bg-background',
  condition: 'bg-background',
  action: 'bg-background',
};

export const CATEGORY_ICON_BG: Record<NodeCategory, string> = {
  trigger: 'bg-blue-500/20',
  condition: 'bg-amber-500/20',
  action: 'bg-emerald-500/20',
};

export const CATEGORY_ICON_TEXT: Record<NodeCategory, string> = {
  trigger: 'text-blue-600 dark:text-blue-400',
  condition: 'text-amber-600 dark:text-amber-400',
  action: 'text-emerald-600 dark:text-emerald-400',
};

export const CATEGORY_HANDLE: Record<NodeCategory, string> = {
  trigger: '!bg-blue-500 !border-background hover:!bg-blue-600',
  condition: '!bg-amber-500 !border-background hover:!bg-amber-600',
  action: '!bg-emerald-500 !border-background hover:!bg-emerald-600',
};

export const DEFAULT_WORKFLOW_NAME = 'Untitled Workflow';

let nodeCounter = 0;

export function makeNodeId(type: AutomationNodeType): string {
  return `${type.split(':')[1]}-${Date.now()}-${++nodeCounter}`;
}
