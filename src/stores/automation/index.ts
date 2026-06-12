import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AutomationState } from './types';
import { createWorkflowsSlice } from './slices/workflows-slice';
import { createExecutionSlice } from './slices/execution-slice';
import { createLogsSlice } from './slices/logs-slice';
import { createRuntimeSlice } from './slices/runtime-slice';
import { createLiveTrafficSlice } from './slices/live-traffic-slice';
import { DEFAULT_AUTOMATION_SETTINGS, capExecutionLogs, normalizeAutomationSettings } from './constants';

export const useAutomationStore = create<AutomationState>()(
  persist(
    (set, get) => ({
      ...createWorkflowsSlice(set as never, get as never),
      ...createExecutionSlice(set as never, get as never),
      ...createLogsSlice(set as never, get as never),
      ...createRuntimeSlice(set as never, get as never),
      ...createLiveTrafficSlice(set as never, get as never),
    }),
    {
      name: '0xbuffer-automation',
      partialize: (state) => ({
        workflows: state.workflows,
        activeWorkflowId: state.activeWorkflowId,
        automationSettings: state.automationSettings,
      }),
      merge: (persistedState, currentState) => {
        const typedState = persistedState as Partial<AutomationState> | undefined;
        const persistedWorkflows = typedState?.workflows ?? [];
        const persistedActiveId = typedState?.activeWorkflowId ?? null;
        // Validate that activeWorkflowId still points to an existing workflow
        const validActiveId =
          persistedActiveId && persistedWorkflows.some((w) => w.id === persistedActiveId)
            ? persistedActiveId
            : persistedWorkflows[0]?.id ?? null;
        return {
          ...currentState,
          ...typedState,
          workflows: persistedWorkflows,
          activeWorkflowId: validActiveId,
          automationSettings: normalizeAutomationSettings(
            typedState?.automationSettings ?? DEFAULT_AUTOMATION_SETTINGS
          ),
          executionLogs: capExecutionLogs(currentState.executionLogs),
          nodeRuntimeById: {},
          liveTrafficHostInsights: [],
          liveTrafficCapturedHosts: [],
          liveTrafficQueueStatsByTriggerId: {},
          runningWorkflowIds: [],
          workflowAbortQueueRevisionById: {},
          activeRunWorkflowId: null,
          executingNodeId: null,
          isRunning: false,
        };
      },
    }
  )
);

// Re-export all types for consumers
export type {
  ExecutionLog,
  NodeRuntimeStatus,
  NodeRuntimeState,
  LiveTrafficHostInsight,
  LiveTrafficQueueStats,
  AutomationRuntimeSettings,
  WorkflowContext,
  AutomationState,
} from './types';
export { AUTOMATION_LOG_LIMIT, LIVE_TRAFFIC_HOST_INSIGHT_LIMIT } from './constants';
