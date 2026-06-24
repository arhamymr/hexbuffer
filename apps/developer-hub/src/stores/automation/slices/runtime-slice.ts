import { capExecutionLogs, removeRunningWorkflowId } from '../constants';
import type { AutomationState, NodeRuntimeState, WorkflowRuntimeState } from '../types';

export interface RuntimeSlice {
  nodeRuntimeById: Record<string, NodeRuntimeState>;
  workflowRuntimeById: Record<string, WorkflowRuntimeState>;

  setNodeRuntimeStatus: (
    nodeId: string,
    runtime: Omit<NodeRuntimeState, 'updatedAt'> & { updatedAt?: string }
  ) => void;
  setNodeRuntimeStatuses: (
    runtimes: Array<{
      nodeId: string;
      runtime: Omit<NodeRuntimeState, 'updatedAt'> & { updatedAt?: string };
    }>
  ) => void;
  setWorkflowRuntimeSnapshot: (snapshot: {
    runningWorkflowIds: string[];
    activeRunWorkflowId?: string | null;
    executingNodeId?: string | null;
  }) => void;
  clearWorkflowRuntimeStatus: (workflowId: string) => void;
}

export const createRuntimeSlice = (
  set: (partial: Partial<AutomationState> | ((state: AutomationState) => Partial<AutomationState>)) => void,
  _get: () => AutomationState
): RuntimeSlice => ({
  nodeRuntimeById: {},
  workflowRuntimeById: {},

  setNodeRuntimeStatus: (nodeId, runtime) => {
    set((state) => ({
      nodeRuntimeById: {
        ...state.nodeRuntimeById,
        [nodeId]: {
          ...runtime,
          updatedAt: runtime.updatedAt ?? new Date().toISOString(),
        },
      },
    }));
  },

  setNodeRuntimeStatuses: (runtimes) => {
    if (runtimes.length === 0) return;
    const now = new Date().toISOString();
    set((state) => {
      const nodeRuntimeById = { ...state.nodeRuntimeById };
      for (const { nodeId, runtime } of runtimes) {
        nodeRuntimeById[nodeId] = {
          ...runtime,
          updatedAt: runtime.updatedAt ?? now,
        };
      }
      return { nodeRuntimeById };
    });
  },

  setWorkflowRuntimeSnapshot: (snapshot) => {
    const now = new Date().toISOString();
    set((state) => {
      const runningWorkflowIds = Array.from(new Set(snapshot.runningWorkflowIds ?? []));
      const runningSet = new Set(runningWorkflowIds);
      const workflowRuntimeById: Record<string, WorkflowRuntimeState> = {
        ...state.workflowRuntimeById,
      };

      for (const [workflowId, runtime] of Object.entries(workflowRuntimeById)) {
        if (runtime.processing && !runningSet.has(workflowId)) {
          workflowRuntimeById[workflowId] = {
            ...runtime,
            processing: false,
            executingNodeId: null,
            updatedAt: now,
          };
        }
      }

      for (const workflowId of runningWorkflowIds) {
        workflowRuntimeById[workflowId] = {
          processing: true,
          executingNodeId:
            snapshot.activeRunWorkflowId === workflowId
              ? snapshot.executingNodeId ?? null
              : workflowRuntimeById[workflowId]?.executingNodeId ?? null,
          updatedAt: now,
        };
      }

      return {
        workflowRuntimeById,
        runningWorkflowIds,
        activeRunWorkflowId: snapshot.activeRunWorkflowId ?? runningWorkflowIds[0] ?? null,
        executingNodeId: snapshot.executingNodeId ?? null,
        isRunning: runningWorkflowIds.length > 0,
      };
    });
  },

  clearWorkflowRuntimeStatus: (workflowId) => {
    set((state) => {
      const nodeRuntimeById = Object.fromEntries(
        Object.entries(state.nodeRuntimeById).filter(
          ([, runtime]) => runtime.workflowId !== workflowId
        )
      );
      const workflowRuntimeById = {
        ...state.workflowRuntimeById,
        [workflowId]: {
          processing: false,
          executingNodeId: null,
          updatedAt: new Date().toISOString(),
        },
      };
      const runningWorkflowIds = removeRunningWorkflowId(state.runningWorkflowIds, workflowId);
      return {
        nodeRuntimeById,
        workflowRuntimeById,
        runningWorkflowIds,
        activeRunWorkflowId:
          state.activeRunWorkflowId === workflowId
            ? runningWorkflowIds[0] ?? null
            : state.activeRunWorkflowId,
        executingNodeId:
          state.activeRunWorkflowId === workflowId ? null : state.executingNodeId,
        isRunning: runningWorkflowIds.length > 0,
        executionLogs: capExecutionLogs(state.executionLogs),
      };
    });
  },
});
