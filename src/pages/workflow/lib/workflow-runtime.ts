import type { WorkflowRuntimeState } from '@/stores/automation';

export function isWorkflowProcessing(
  workflowId: string | null | undefined,
  workflowRuntimeById: Record<string, WorkflowRuntimeState>
): boolean {
  if (!workflowId) return false;
  return Boolean(workflowRuntimeById[workflowId]?.processing);
}
