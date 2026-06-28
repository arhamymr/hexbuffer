import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import type { WorkflowRun, WorkflowRunStep } from '@/pages/automation/types';
import { getWorkflowReadiness } from '@/pages/automation/lib/workflow-readiness';
import { AUTOMATION_LOG_UI_LIMIT, removeRunningWorkflowId, capExecutionLogs } from '../constants';
import type { AutomationState, ExecutionLog, WorkflowContext } from '../types';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export interface ExecutionSlice {
  runHistory: WorkflowRun[];
  selectedRunId: string | null;
  selectedRunSteps: WorkflowRunStep[];
  isRunning: boolean;
  activeRunWorkflowId: string | null;
  runningWorkflowIds: string[];
  workflowAbortQueueRevisionById: Record<string, number>;
  executingNodeId: string | null;

  runWorkflow: (workflowId: string, context?: WorkflowContext) => Promise<void>;
  abortWorkflow: (workflowId: string, reason?: string) => void;
  abortWorkflows: (workflowIds: string[], reason?: string) => void;
  stopWorkflow: () => void;
  selectRun: (runId: string | null) => void;
}

function isTauriAvailable() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
}

function getRunTriggerNode(
  workflow: NonNullable<AutomationState['workflows'][number]>,
  context?: WorkflowContext
) {
  if (context?.triggerNodeId) {
    return workflow.nodes.find((node) => node.id === context.triggerNodeId) ?? null;
  }

  const targets = new Set(workflow.edges.map((edge) => edge.target));
  return (
    workflow.nodes.find((node) => {
      const nodeType = String(node.data?.nodeType ?? node.type ?? '');
      return nodeType.startsWith('trigger:') && !targets.has(node.id);
    }) ??
    workflow.nodes.find((node) => String(node.data?.nodeType ?? node.type ?? '').startsWith('trigger:')) ??
    null
  );
}

export const createExecutionSlice = (
  set: (partial: Partial<AutomationState> | ((state: AutomationState) => Partial<AutomationState>)) => void,
  get: () => AutomationState
): ExecutionSlice => ({
  runHistory: [],
  selectedRunId: null,
  selectedRunSteps: [],
  isRunning: false,
  activeRunWorkflowId: null,
  runningWorkflowIds: [],
  workflowAbortQueueRevisionById: {},
  executingNodeId: null,

  runWorkflow: async (workflowId: string, context?: WorkflowContext) => {
    const workflow = get().workflows.find((w) => w.id === workflowId);
    if (!workflow) {
      toast.error('FlowArrow is unavailable');
      return;
    }

    const readiness = getWorkflowReadiness(workflow);
    if (!readiness.ready) {
      const message = readiness.reason ?? 'FlowArrow needs action before running';
      toast.error(message);
      get().appendExecutionLog({ workflowId, level: 'error', message });
      return;
    }

    if (!isTauriAvailable()) {
      toast.error('Automation runtime is unavailable');
      return;
    }

    try {
      await invoke('automation_sync_workflows', {
        workflows: get().workflows,
        settings: get().automationSettings,
      });
      await invoke('automation_run_workflow', { workflowId, context: context ?? null });
      const triggerNode = getRunTriggerNode(workflow, context);
      if (triggerNode) {
        const label = triggerNode.data?.label ?? 'Trigger';
        get().setWorkflowRuntimeSnapshot({
          runningWorkflowIds: [workflowId],
          activeRunWorkflowId: workflowId,
          executingNodeId: triggerNode.id,
        });
        get().setNodeRuntimeStatus(triggerNode.id, {
          workflowId,
          status: 'running',
          message: `Processing: ${label}`,
          inputData: context?.data,
          outputData: context?.data,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || 'FlowArrow failed');
      toast.error(message);
      get().appendExecutionLog({ workflowId, level: 'error', message });
    }
  },

  abortWorkflow: (workflowId, reason = 'stopped') => {
    if (isTauriAvailable()) {
      void invoke('automation_abort_workflow', { workflowId, reason }).catch((error) => {
        console.error('Failed to abort workflow:', error);
      });
    }

    set((state) => {
      const runningWorkflowIds = removeRunningWorkflowId(state.runningWorkflowIds, workflowId);
      const isKnownRun = state.runningWorkflowIds.includes(workflowId);
      const timestamp = new Date().toISOString();
      const abortLog: ExecutionLog = {
        id: crypto.randomUUID(),
        workflowId,
        timestamp,
        level: 'warning',
        message: `FlowArrow aborted: ${reason}`,
      };
      const nodeRuntimeById = Object.fromEntries(
        Object.entries(state.nodeRuntimeById).map(([nodeId, runtime]) => [
          nodeId,
          runtime.workflowId === workflowId && runtime.status === 'running'
            ? {
                ...runtime,
                status: 'skipped' as const,
                message: `FlowArrow aborted: ${reason}`,
                updatedAt: timestamp,
              }
            : runtime,
        ])
      );
      return {
        runningWorkflowIds,
        workflowAbortQueueRevisionById: {
          ...state.workflowAbortQueueRevisionById,
          [workflowId]: (state.workflowAbortQueueRevisionById[workflowId] ?? 0) + 1,
        },
        isRunning: runningWorkflowIds.length > 0,
        activeRunWorkflowId:
          state.activeRunWorkflowId === workflowId
            ? runningWorkflowIds[0] ?? null
            : state.activeRunWorkflowId,
        executingNodeId: state.activeRunWorkflowId === workflowId ? null : state.executingNodeId,
        nodeRuntimeById,
        workflowRuntimeById: {
          ...state.workflowRuntimeById,
          [workflowId]: {
            processing: false,
            executingNodeId: null,
            updatedAt: timestamp,
          },
        },
        executionLogs: isKnownRun
          ? capExecutionLogs([...state.executionLogs, abortLog])
          : state.executionLogs,
        executionLogsByWorkflowId: isKnownRun
          ? {
              ...state.executionLogsByWorkflowId,
              [workflowId]: [
                ...(state.executionLogsByWorkflowId[workflowId] ?? []),
                abortLog,
              ].slice(-AUTOMATION_LOG_UI_LIMIT),
            }
          : state.executionLogsByWorkflowId,
      };
    });
  },

  abortWorkflows: (workflowIds, reason = 'stopped') => {
    for (const workflowId of workflowIds) {
      get().abortWorkflow(workflowId, reason);
    }
  },

  stopWorkflow: () => {
    const { activeWorkflowId, activeRunWorkflowId } = get();
    const workflowId = activeRunWorkflowId ?? activeWorkflowId;
    if (!workflowId) return;
    get().abortWorkflow(workflowId, 'stopped by user');
  },

  selectRun: (runId) => {
    set({ selectedRunId: runId });
  },
});
