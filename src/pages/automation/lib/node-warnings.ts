import type { NodeRuntimeState } from '@/stores/automation';
import type { AutomationNodeData, TriggerConfig } from '../types';

export function getLiveTrafficSetupWarning(config: TriggerConfig): string | null {
  if (config.triggerType !== 'trigger:live-traffic-captured') return null;
  if (config.host?.trim()) return null;
  return 'Live traffic is unfiltered. Set a host filter so this trigger only listens to relevant traffic.';
}

export function getAutomationNodeWarning(
  nodeData: AutomationNodeData,
  runtime: NodeRuntimeState | null
): string | null {
  if (runtime?.status === 'skipped') {
    return runtime.message || 'Node was skipped or unreachable during the latest run.';
  }

  if (nodeData.nodeType === 'trigger:live-traffic-captured') {
    return getLiveTrafficSetupWarning(nodeData.config as TriggerConfig);
  }

  return null;
}
