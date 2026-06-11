import type { AutomationNodeData, AutomationNodeType } from '../types';

export interface AutomationNodeCapability {
  supported: boolean;
  reason: string | null;
}

const WIRED_TRIGGER_TYPES = new Set<AutomationNodeType>([
  'trigger:manual',
  'trigger:live-traffic-captured',
]);

const WIRED_ACTION_TYPES = new Set<AutomationNodeType>([
  'action:add-to-report',
]);

export function getAutomationNodeCapability(nodeData: AutomationNodeData): AutomationNodeCapability {
  const nodeType = nodeData.nodeType;

  if (WIRED_TRIGGER_TYPES.has(nodeType) || WIRED_ACTION_TYPES.has(nodeType)) {
    return { supported: true, reason: null };
  }

  if (nodeType.startsWith('condition:')) {
    return {
      supported: false,
      reason: 'This condition has setup UI, but condition evaluation is not wired into workflow execution yet.',
    };
  }

  if (nodeType.startsWith('trigger:')) {
    return {
      supported: false,
      reason: 'This trigger has setup UI, but no real event source is wired yet.',
    };
  }

  if (nodeType.startsWith('action:')) {
    return {
      supported: false,
      reason: 'This action has setup UI, but real action execution is not wired yet.',
    };
  }

  return {
    supported: false,
    reason: 'This node is not wired to a real automation capability yet.',
  };
}
