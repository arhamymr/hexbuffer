import { invoke } from '@tauri-apps/api/core';
import { AUTOMATION_LOG_UI_LIMIT, capExecutionLogs } from '../constants';
import type { AutomationState, ExecutionLog, NodeRuntimeStatus, NewExecutionLog } from '../types';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export interface LogsSlice {
  executionLogs: ExecutionLog[];
  executionLogsByWorkflowId: Record<string, ExecutionLog[]>;

  appendExecutionLog: (log: NewExecutionLog, runtimeStatus?: NodeRuntimeStatus) => void;
  appendExecutionLogs: (logs: NewExecutionLog[]) => void;
  clearLogs: (workflowId?: string) => void;
  pruneExecutionLogs: () => void;
}

export const createLogsSlice = (
  set: (partial: Partial<AutomationState> | ((state: AutomationState) => Partial<AutomationState>)) => void,
  _get: () => AutomationState
): LogsSlice => ({
  executionLogs: [],
  executionLogsByWorkflowId: {},

  appendExecutionLog: (log, runtimeStatus) => {
    const timestamp = log.timestamp ?? new Date().toISOString();
    const nextLog: ExecutionLog = {
      ...log,
      id: log.id ?? crypto.randomUUID(),
      timestamp,
    };
    set((state) => ({
      executionLogs: capExecutionLogs(dedupeById([...state.executionLogs, nextLog])),
      executionLogsByWorkflowId: appendLogsByWorkflow(
        state.executionLogsByWorkflowId,
        [nextLog]
      ),
      nodeRuntimeById:
        runtimeStatus && log.nodeId
          ? {
              ...state.nodeRuntimeById,
              [log.nodeId]: {
                workflowId: log.workflowId,
                status: runtimeStatus,
                message: log.message,
                inputData: log.inputData,
                outputData: log.outputData,
                updatedAt: timestamp,
              },
            }
          : state.nodeRuntimeById,
    }));
  },

  appendExecutionLogs: (logs) => {
    if (logs.length === 0) return;
    const now = new Date().toISOString();
    const nextLogs: ExecutionLog[] = logs.map((log) => ({
      ...log,
      id: log.id ?? crypto.randomUUID(),
      timestamp: log.timestamp ?? now,
    }));
    set((state) => ({
      executionLogs: capExecutionLogs(dedupeById([...state.executionLogs, ...nextLogs])),
      executionLogsByWorkflowId: appendLogsByWorkflow(
        state.executionLogsByWorkflowId,
        nextLogs
      ),
    }));
  },

  clearLogs: (workflowId) => set((state) => {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      void invoke('automation_clear_logs', { workflowId: workflowId ?? null }).catch((error) => {
        console.error('Failed to clear automation logs:', error);
      });
    }

    if (!workflowId) {
      return { executionLogs: [], executionLogsByWorkflowId: {}, nodeRuntimeById: {} };
    }

    const nodeRuntimeById = Object.fromEntries(
      Object.entries(state.nodeRuntimeById).filter(
        ([, runtime]) => runtime.workflowId !== workflowId
      )
    );

    return {
      executionLogs: state.executionLogs.filter((log) => log.workflowId !== workflowId),
      executionLogsByWorkflowId: omitKey(state.executionLogsByWorkflowId, workflowId),
      nodeRuntimeById,
    };
  }),

  pruneExecutionLogs: () => {
    set((state) => ({
      executionLogs: capExecutionLogs(state.executionLogs),
      executionLogsByWorkflowId: rebuildLogsByWorkflow(state.executionLogs),
    }));
  },
});

function appendLogsByWorkflow(
  current: Record<string, ExecutionLog[]>,
  logs: ExecutionLog[]
): Record<string, ExecutionLog[]> {
  if (logs.length === 0) return current;
  const next = { ...current };
  for (const log of logs) {
    const workflowLogs = next[log.workflowId] ?? [];
    next[log.workflowId] = dedupeById([...workflowLogs, log]).slice(-AUTOMATION_LOG_UI_LIMIT);
  }
  return next;
}

function rebuildLogsByWorkflow(logs: ExecutionLog[]): Record<string, ExecutionLog[]> {
  return appendLogsByWorkflow({}, capExecutionLogs(logs));
}

function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = record;
  return rest;
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
