import type { NodeRuntimeState } from '@/stores/automation';

export function isWorkflowProcessing(
  workflowId: string | null | undefined,
  runningWorkflowIds: string[],
  nodeRuntimeById: Record<string, NodeRuntimeState>
): boolean {
  if (!workflowId) return false;
  if (runningWorkflowIds.includes(workflowId)) return true;

  return Object.values(nodeRuntimeById).some(
    (runtime) => runtime.workflowId === workflowId && runtime.status === 'running'
  );
}
