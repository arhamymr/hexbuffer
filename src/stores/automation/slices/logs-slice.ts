import { capExecutionLogs } from '../constants';
import type { AutomationState, ExecutionLog, NodeRuntimeStatus, NewExecutionLog } from '../types';

export interface LogsSlice {
  executionLogs: ExecutionLog[];

  appendExecutionLog: (log: NewExecutionLog, runtimeStatus?: NodeRuntimeStatus) => void;
  clearLogs: (workflowId?: string) => void;
  pruneExecutionLogs: () => void;
}

export const createLogsSlice = (
  set: (partial: Partial<AutomationState> | ((state: AutomationState) => Partial<AutomationState>)) => void,
  _get: () => AutomationState
): LogsSlice => ({
  executionLogs: [],

  appendExecutionLog: (log, runtimeStatus) => {
    const timestamp = log.timestamp ?? new Date().toISOString();
    const nextLog: ExecutionLog = {
      ...log,
      id: log.id ?? crypto.randomUUID(),
      timestamp,
    };
    set((state) => ({
      executionLogs: capExecutionLogs([...state.executionLogs, nextLog]),
      nodeRuntimeById:
        runtimeStatus && log.nodeId
          ? {
              ...state.nodeRuntimeById,
              [log.nodeId]: {
                workflowId: log.workflowId,
                status: runtimeStatus,
                message: log.message,
                updatedAt: timestamp,
              },
            }
          : state.nodeRuntimeById,
    }));
  },

  clearLogs: (workflowId) => set((state) => {
    if (!workflowId) {
      return { executionLogs: [], nodeRuntimeById: {} };
    }

    const nodeRuntimeById = Object.fromEntries(
      Object.entries(state.nodeRuntimeById).filter(
        ([, runtime]) => runtime.workflowId !== workflowId
      )
    );

    return {
      executionLogs: state.executionLogs.filter((log) => log.workflowId !== workflowId),
      nodeRuntimeById,
    };
  }),

  pruneExecutionLogs: () => {
    set((state) => ({ executionLogs: capExecutionLogs(state.executionLogs) }));
  },
});
