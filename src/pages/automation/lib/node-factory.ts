import { NODE_TYPE_REGISTRY, makeNodeId } from '../constants';
import type {
  AutomationNode,
  AutomationNodeData,
  AutomationNodeType,
  NodeConfig,
} from '../types';

export function hasTriggerNode(nodes: Array<{ type?: string | null }>): boolean {
  return nodes.some((node) => (node.type as string)?.startsWith('trigger:'));
}

export function createAutomationNode(
  nodeType: AutomationNodeType,
  position: { x: number; y: number }
): AutomationNode | null {
  const def = NODE_TYPE_REGISTRY[nodeType];
  if (!def) return null;

  return {
    id: makeNodeId(nodeType),
    type: nodeType,
    position,
    data: {
      label: def.label,
      nodeType,
      category: def.category,
      config: def.defaultConfig as NodeConfig,
      iconName: def.iconName,
    } satisfies AutomationNodeData,
  };
}
