import type { NodeRuntimeState } from '@/stores/automation';
import type { AutomationNodeData, TriggerConfig } from '../types';

export function getLiveTrafficSetupWarning(config: TriggerConfig): string | null {
  if (config.triggerType !== 'trigger:live-traffic-captured') return null;
  if (config.host?.trim()) return null;
  return 'Live Traffic Captured requires at least one host before it can listen or run.';
}

export function getTriggerHostSetupWarning(config: TriggerConfig): string | null {
  if (config.host?.trim()) return null;
  if (config.triggerType === 'trigger:live-traffic-captured') {
    return 'Live Traffic Captured requires at least one host before it can listen or run.';
  }
  if (config.triggerType === 'trigger:websocket-message') {
    return 'WebSocket Message requires at least one host before it can listen or run.';
  }
  return null;
}

export function getAutomationNodeWarning(
  nodeData: AutomationNodeData,
  runtime: NodeRuntimeState | null
): string | null {
  if (runtime?.status === 'skipped') {
    return runtime.message || 'Node was skipped or unreachable during the latest run.';
  }

  if (
    nodeData.nodeType === 'trigger:live-traffic-captured' ||
    nodeData.nodeType === 'trigger:websocket-message'
  ) {
    return getTriggerHostSetupWarning(nodeData.config as TriggerConfig);
  }

  return null;
}
