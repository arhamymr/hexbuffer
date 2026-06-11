import { capExecutionLogs } from '../constants';
import type { AutomationState, NodeRuntimeState } from '../types';

export interface RuntimeSlice {
  nodeRuntimeById: Record<string, NodeRuntimeState>;

  setNodeRuntimeStatus: (
    nodeId: string,
    runtime: Omit<NodeRuntimeState, 'updatedAt'> & { updatedAt?: string }
  ) => void;
  clearWorkflowRuntimeStatus: (workflowId: string) => void;
}

export const createRuntimeSlice = (
  set: (partial: Partial<AutomationState> | ((state: AutomationState) => Partial<AutomationState>)) => void,
  _get: () => AutomationState
): RuntimeSlice => ({
  nodeRuntimeById: {},

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

  clearWorkflowRuntimeStatus: (workflowId) => {
    set((state) => {
      const nodeRuntimeById = Object.fromEntries(
        Object.entries(state.nodeRuntimeById).filter(
          ([, runtime]) => runtime.workflowId !== workflowId
        )
      );
      return {
        nodeRuntimeById,
        executionLogs: capExecutionLogs(state.executionLogs),
      };
    });
  },
});
