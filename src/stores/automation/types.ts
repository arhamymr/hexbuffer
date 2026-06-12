import type {
  WorkflowDef,
  WorkflowRun,
  WorkflowRunStep,
} from '@/pages/automation/types';

export interface ExecutionLog {
  id: string;
  workflowId: string;
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  nodeId?: string;
  nodeLabel?: string;
  inputData?: unknown;
  outputData?: unknown;
}

export type NodeRuntimeStatus = 'running' | 'success' | 'error' | 'skipped';

export interface NodeRuntimeState {
  workflowId: string;
  status: NodeRuntimeStatus;
  message?: string;
  updatedAt: string;
}

export interface LiveTrafficHostInsight {
  id: string;
  workflowId: string;
  workflowName: string;
  triggerNodeId: string;
  triggerNodeLabel: string;
  host: string;
  method: string;
  status?: number;
  path: string;
  matchedAt: string;
}

export interface LiveTrafficQueueStats {
  pending: number;
  dropped: number;
  lastDroppedAt?: string;
  cap: number;
}

export interface AutomationRuntimeSettings {
  liveTrafficConcurrency: number;
  filteredTriggerQueueCap: number;
  catchAllTriggerQueueCap: number;
  recentMatchDedupeTtlMs: number;
}

/** Data passed from a trigger to downstream action/condition nodes. */
export interface WorkflowContext {
  triggerType?: string;
  data?: Record<string, unknown>;
}

export type NewExecutionLog = Omit<ExecutionLog, 'id' | 'timestamp'> & {
  id?: string;
  timestamp?: string;
};

export type NewLiveTrafficHostInsight = Omit<LiveTrafficHostInsight, 'id' | 'matchedAt'> & {
  id?: string;
  matchedAt?: string;
};

export interface AutomationState {
  workflows: WorkflowDef[];
  activeWorkflowId: string | null;
  isDirty: boolean;
  runHistory: WorkflowRun[];
  selectedRunId: string | null;
  selectedRunSteps: WorkflowRunStep[];
  isRunning: boolean;
  activeRunWorkflowId: string | null;
  runningWorkflowIds: string[];
  workflowAbortQueueRevisionById: Record<string, number>;
  executingNodeId: string | null;
  executionLogs: ExecutionLog[];
  nodeRuntimeById: Record<string, NodeRuntimeState>;
  liveTrafficHostInsights: LiveTrafficHostInsight[];
  liveTrafficCapturedHosts: LiveTrafficHostInsight[];
  liveTrafficQueueStatsByTriggerId: Record<string, LiveTrafficQueueStats>;
  automationSettings: AutomationRuntimeSettings;

  createWorkflow: () => string;
  createWorkflowFromTemplate: (templateId: string) => string;
  loadWorkflow: (id: string) => void;
  saveWorkflow: (nodes: unknown, edges: unknown) => void;
  saveWorkflowById: (workflowId: string, nodes: unknown, edges: unknown) => void;
  deleteWorkflow: (id: string) => void;
  deleteWorkflows: (ids: string[]) => void;
  renameWorkflow: (id: string, name: string) => void;
  setWorkflowName: (id: string, name: string) => void;
  toggleWorkflowEnabled: (id: string) => void;
  setActiveWorkflowId: (id: string | null) => void;

  runWorkflow: (workflowId: string, context?: WorkflowContext) => Promise<void>;
  abortWorkflow: (workflowId: string, reason?: string) => void;
  abortWorkflows: (workflowIds: string[], reason?: string) => void;
  stopWorkflow: () => void;
  selectRun: (runId: string | null) => void;
  appendExecutionLog: (log: NewExecutionLog, runtimeStatus?: NodeRuntimeStatus) => void;
  appendLiveTrafficHostInsight: (insight: NewLiveTrafficHostInsight) => void;
  appendLiveTrafficCapturedHost: (insight: NewLiveTrafficHostInsight) => void;
  removeLiveTrafficHostInsight: (id: string) => void;
  setLiveTrafficQueueStats: (triggerNodeId: string, stats: LiveTrafficQueueStats) => void;
  incrementLiveTrafficDropped: (triggerNodeId: string, cap: number) => void;
  setNodeRuntimeStatus: (
    nodeId: string,
    runtime: Omit<NodeRuntimeState, 'updatedAt'> & { updatedAt?: string }
  ) => void;
  clearWorkflowRuntimeStatus: (workflowId: string) => void;
  pruneExecutionLogs: () => void;
  clearLiveTrafficHostInsights: (triggerNodeId?: string) => void;
  clearLiveTrafficCapturedHosts: (triggerNodeId?: string) => void;
  clearLogs: (workflowId?: string) => void;
  updateAutomationSettings: (settings: Partial<AutomationRuntimeSettings>) => void;
  resetAutomationSettings: () => void;
}
