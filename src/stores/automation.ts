import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import type {
  WorkflowDef,
  WorkflowRun,
  WorkflowRunStep,
} from '@/pages/automation/types';
import { DEFAULT_WORKFLOW_NAME } from '@/pages/automation/constants';
import { createWorkflowFromTemplate as buildFromTemplate } from '@/pages/automation/templates';
import { getWorkflowReadiness } from '@/pages/automation/lib/workflow-readiness';
import { writeDocument } from '@/triggers/documents';

export interface ExecutionLog {
  id: string;
  workflowId: string;
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  nodeId?: string;
  nodeLabel?: string;
}

export const AUTOMATION_LOG_LIMIT = 500;
export const LIVE_TRAFFIC_HOST_INSIGHT_LIMIT = 200;

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

/** Data passed from a trigger to downstream action/condition nodes. */
export interface WorkflowContext {
  triggerType?: string;
  data?: Record<string, unknown>;
}

type NewExecutionLog = Omit<ExecutionLog, 'id' | 'timestamp'> & {
  id?: string;
  timestamp?: string;
};

type NewLiveTrafficHostInsight = Omit<LiveTrafficHostInsight, 'id' | 'matchedAt'> & {
  id?: string;
  matchedAt?: string;
};

function capExecutionLogs(logs: ExecutionLog[]): ExecutionLog[] {
  const buckets = new Map<string, ExecutionLog[]>();
  for (const log of logs) {
    const existing = buckets.get(log.workflowId) ?? [];
    existing.push(log);
    buckets.set(log.workflowId, existing);
  }

  return Array.from(buckets.values())
    .flatMap((workflowLogs) =>
      workflowLogs.length > AUTOMATION_LOG_LIMIT
        ? workflowLogs.slice(-AUTOMATION_LOG_LIMIT)
        : workflowLogs
    )
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function capLiveTrafficHostInsights(insights: LiveTrafficHostInsight[]): LiveTrafficHostInsight[] {
  return insights.length > LIVE_TRAFFIC_HOST_INSIGHT_LIMIT
    ? insights.slice(-LIVE_TRAFFIC_HOST_INSIGHT_LIMIT)
    : insights;
}

interface AutomationState {
  workflows: WorkflowDef[];
  activeWorkflowId: string | null;
  isDirty: boolean;
  runHistory: WorkflowRun[];
  selectedRunId: string | null;
  selectedRunSteps: WorkflowRunStep[];
  isRunning: boolean;
  activeRunWorkflowId: string | null;
  executingNodeId: string | null;
  executionLogs: ExecutionLog[];
  nodeRuntimeById: Record<string, NodeRuntimeState>;
  liveTrafficHostInsights: LiveTrafficHostInsight[];
  liveTrafficCapturedHosts: LiveTrafficHostInsight[];

  createWorkflow: () => string;
  createWorkflowFromTemplate: (templateId: string) => string;
  loadWorkflow: (id: string) => void;
  saveWorkflow: (nodes: unknown, edges: unknown) => void;
  deleteWorkflow: (id: string) => void;
  deleteWorkflows: (ids: string[]) => void;
  renameWorkflow: (id: string, name: string) => void;
  setWorkflowName: (id: string, name: string) => void;
  toggleWorkflowEnabled: (id: string) => void;
  setActiveWorkflowId: (id: string | null) => void;

  runWorkflow: (workflowId: string, context?: WorkflowContext) => Promise<void>;
  stopWorkflow: () => void;
  selectRun: (runId: string | null) => void;
  appendExecutionLog: (log: NewExecutionLog, runtimeStatus?: NodeRuntimeStatus) => void;
  appendLiveTrafficHostInsight: (insight: NewLiveTrafficHostInsight) => void;
  appendLiveTrafficCapturedHost: (insight: NewLiveTrafficHostInsight) => void;
  removeLiveTrafficHostInsight: (id: string) => void;
  setNodeRuntimeStatus: (
    nodeId: string,
    runtime: Omit<NodeRuntimeState, 'updatedAt'> & { updatedAt?: string }
  ) => void;
  clearWorkflowRuntimeStatus: (workflowId: string) => void;
  pruneExecutionLogs: () => void;
  clearLiveTrafficHostInsights: (triggerNodeId?: string) => void;
  clearLiveTrafficCapturedHosts: (triggerNodeId?: string) => void;
  clearLogs: (workflowId?: string) => void;
}

export const useAutomationStore = create<AutomationState>()(persist(
    (set, get) => ({
      workflows: [],
      activeWorkflowId: null,
      isDirty: false,
      runHistory: [],
      selectedRunId: null,
      selectedRunSteps: [],
      isRunning: false,
      activeRunWorkflowId: null,
      executingNodeId: null,
      executionLogs: [],
      nodeRuntimeById: {},
      liveTrafficHostInsights: [],
      liveTrafficCapturedHosts: [],

      createWorkflow: () => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const workflow: WorkflowDef = {
          id,
          name: DEFAULT_WORKFLOW_NAME,
          description: '',
          enabled: true,
          nodes: [],
          edges: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          workflows: [...state.workflows, workflow],
          activeWorkflowId: id,
          isDirty: false,
        }));
        return id;
      },

      createWorkflowFromTemplate: (templateId: string) => {
        const result = buildFromTemplate(templateId);
        if (!result) return '';
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const workflow: WorkflowDef = {
          id,
          name: result.name,
          description: result.description,
          enabled: true,
          nodes: result.nodes,
          edges: result.edges,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          workflows: [...state.workflows, workflow],
          activeWorkflowId: id,
          isDirty: false,
        }));
        return id;
      },

      loadWorkflow: (id) => {
        set({ activeWorkflowId: id, isDirty: false });
      },

      saveWorkflow: (nodes, edges) => {
        const { activeWorkflowId } = get();
        if (!activeWorkflowId) return;
        const now = new Date().toISOString();
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === activeWorkflowId
              ? { ...w, nodes: nodes as WorkflowDef['nodes'], edges: edges as WorkflowDef['edges'], updatedAt: now }
              : w
          ),
          isDirty: false,
        }));
      },

      deleteWorkflow: (id) => {
        set((state) => {
          const filtered = state.workflows.filter((w) => w.id !== id);
          const nextActive =
            state.activeWorkflowId === id
              ? filtered[0]?.id ?? null
              : state.activeWorkflowId;
          return {
            workflows: filtered,
            activeWorkflowId: nextActive,
            isDirty: false,
          };
        });
      },

      deleteWorkflows: (ids) => {
        set((state) => {
          const idSet = new Set(ids);
          const filtered = state.workflows.filter((w) => !idSet.has(w.id));
          const nextActive =
            state.activeWorkflowId && idSet.has(state.activeWorkflowId)
              ? filtered[0]?.id ?? null
              : state.activeWorkflowId;
          return {
            workflows: filtered,
            activeWorkflowId: nextActive,
            isDirty: false,
          };
        });
      },

      renameWorkflow: (id, name) => {
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === id
              ? { ...w, name, updatedAt: new Date().toISOString() }
              : w
          ),
        }));
      },

      setWorkflowName: (id, name) => {
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === id
              ? { ...w, name, updatedAt: new Date().toISOString() }
              : w
          ),
        }));
      },

      toggleWorkflowEnabled: (id) => {
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === id ? { ...w, enabled: !w.enabled } : w
          ),
        }));
      },

      setActiveWorkflowId: (id) => set({ activeWorkflowId: id, isDirty: false }),

      runWorkflow: async (workflowId: string, context?: WorkflowContext) => {
        const { workflows } = get();
        const workflow = workflows.find((w) => w.id === workflowId);
        if (!workflow) {
          toast.error('Workflow is unavailable');
          return;
        }

        const readiness = getWorkflowReadiness(workflow);
        if (!readiness.ready) {
          const message = readiness.reason ?? 'Workflow needs action before running';
          toast.error(message);
          get().appendExecutionLog({ workflowId, level: 'error', message });
          set({ isRunning: false, activeRunWorkflowId: null, executingNodeId: null });
          return;
        }

        const resolveTemplate = (template: string) => {
          if (!context?.data) return template;
          return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
            const val = context.data![key];
            return val != null ? String(val) : `{{${key}}}`;
          });
        };

        const addLog = (
          level: ExecutionLog['level'],
          message: string,
          nodeId?: string,
          nodeLabel?: string,
          runtimeStatus?: NodeRuntimeStatus
        ) => {
          get().appendExecutionLog(
            {
              workflowId,
              level,
              message,
              nodeId,
              nodeLabel,
            },
            runtimeStatus
          );
        };

        get().clearWorkflowRuntimeStatus(workflowId);
        set({ isRunning: true, activeRunWorkflowId: workflowId, executingNodeId: null });
        addLog('info', `Starting workflow: ${workflow.name}`);

        const nodes = (workflow.nodes ?? []) as Array<{
          id: string;
          type?: string;
          data?: {
            label?: string;
            config?: { actionType?: string; params?: Record<string, string> };
          };
        }>;
        const edges = (workflow.edges ?? []) as Array<{ source: string; target: string }>;

        if (nodes.length === 0) {
          addLog('warning', 'Workflow has no nodes');
          toast.error('Add at least one node before running');
          set({ isRunning: false, activeRunWorkflowId: null, executingNodeId: null });
          return;
        }

        // Find triggers (starting nodes)
        const targets = new Set(edges.map((e) => e.target));
        const triggers = nodes.filter((n) => !targets.has(n.id));

        if (triggers.length === 0) {
          addLog('warning', 'No trigger nodes found (nodes without incoming edges)');
          toast.error('Add a starting node before running');
        }

        // Walk through nodes in topological order (simple BFS)
        const visited = new Set<string>();
        const queue = [...triggers.map((n) => n.id)];

        for (const nodeId of queue) {
          if (visited.has(nodeId)) continue;
          visited.add(nodeId);

          const node = nodes.find((n) => n.id === nodeId);
          if (!node) continue;

          const label = node.data?.label ?? node.type ?? 'Unknown';
          set({ executingNodeId: nodeId });
          addLog('info', `Executing: ${label}`, nodeId, label, 'running');

          // ── Real action execution ──
          if (node.type === 'action:add-to-report') {
            const cfg = node.data?.config;
            if (cfg?.actionType === 'action:add-to-report') {
              const p = cfg.params ?? {};
              try {
                const resolvedContent = resolveTemplate(p.content || '(no content)');
                const resolvedTitle = resolveTemplate(p.title || 'Workflow Report');
                writeDocument({
                  documentId: p.documentId || undefined,
                  sectionKey: p.section || undefined,
                  title: resolvedTitle || undefined,
                  content: resolvedContent,
                  mode: (p.mode as 'append' | 'replace') || 'append',
                });
                addLog('success', context?.data ? `Report updated (with context)` : `Report updated`, nodeId, label, 'success');
              } catch (err) {
                const message = `Failed: ${err instanceof Error ? err.message : 'unknown'}`;
                addLog('error', message, nodeId, label, 'error');
                toast.error(message);
              }
            }
          } else if (node.type?.startsWith('trigger:')) {
            // Trigger node — log the incoming context data
            if (context?.data) {
              const host = context.data.host;
              addLog('info', `Trigger host: ${typeof host === 'string' && host ? host : '(unknown)'}`, nodeId, label);
            }
            addLog('success', `Triggered: ${label}`, nodeId, label, 'success');
          } else {
            // Simulate step execution for other node types
            await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
            addLog('success', `Completed: ${label}`, nodeId, label, 'success');
          }

          // Find next nodes
          const outgoing = edges.filter((e) => e.source === nodeId);
          for (const edge of outgoing) {
            if (!visited.has(edge.target)) {
              queue.push(edge.target);
            }
          }
        }

        // Log any unvisited nodes
        for (const node of nodes) {
          if (!visited.has(node.id)) {
            const label = node.data?.label ?? node.type ?? 'Unknown';
            addLog('warning', `Skipped (unreachable): ${label}`, node.id, label, 'skipped');
          }
        }

        addLog('success', `Workflow completed: ${visited.size}/${nodes.length} nodes executed`);
        set({ isRunning: false, activeRunWorkflowId: null, executingNodeId: null });
      },

      stopWorkflow: () => {
        const { activeWorkflowId, activeRunWorkflowId } = get();
        const workflowId = activeRunWorkflowId ?? activeWorkflowId;
        if (!workflowId) return;
        const wf = get().workflows.find((w) => w.id === workflowId);
        get().appendExecutionLog({
          workflowId,
          level: 'warning',
          message: `Workflow stopped by user${wf ? ': ' + wf.name : ''}`,
        });
        set({ isRunning: false, activeRunWorkflowId: null, executingNodeId: null });
      },

      selectRun: (runId) => {
        set({ selectedRunId: runId });
      },

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

      appendLiveTrafficHostInsight: (insight) => {
        const matchedAt = insight.matchedAt ?? new Date().toISOString();
        const nextInsight: LiveTrafficHostInsight = {
          ...insight,
          id: insight.id ?? crypto.randomUUID(),
          matchedAt,
        };
        set((state) => ({
          liveTrafficHostInsights: capLiveTrafficHostInsights([
            ...state.liveTrafficHostInsights,
            nextInsight,
          ]),
        }));
      },

      appendLiveTrafficCapturedHost: (insight) => {
        const matchedAt = insight.matchedAt ?? new Date().toISOString();
        const nextInsight: LiveTrafficHostInsight = {
          ...insight,
          id: insight.id ?? crypto.randomUUID(),
          matchedAt,
        };
        set((state) => ({
          liveTrafficCapturedHosts: capLiveTrafficHostInsights([
            ...state.liveTrafficCapturedHosts,
            nextInsight,
          ]),
        }));
      },

      removeLiveTrafficHostInsight: (id) => set((state) => ({
        liveTrafficHostInsights: state.liveTrafficHostInsights.filter((item) => item.id !== id),
      })),

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

      pruneExecutionLogs: () => {
        set((state) => ({ executionLogs: capExecutionLogs(state.executionLogs) }));
      },

      clearLiveTrafficHostInsights: (triggerNodeId) => set((state) => ({
        liveTrafficHostInsights: triggerNodeId
          ? state.liveTrafficHostInsights.filter((item) => item.triggerNodeId !== triggerNodeId)
          : [],
      })),

      clearLiveTrafficCapturedHosts: (triggerNodeId) => set((state) => ({
        liveTrafficCapturedHosts: triggerNodeId
          ? state.liveTrafficCapturedHosts.filter((item) => item.triggerNodeId !== triggerNodeId)
          : [],
      })),

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
    }),
    {
      name: '0xbuffer-automation',
      partialize: (state) => ({
          workflows: state.workflows,
          activeWorkflowId: state.activeWorkflowId,
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
          executionLogs: capExecutionLogs(currentState.executionLogs),
          nodeRuntimeById: {},
          liveTrafficHostInsights: [],
          liveTrafficCapturedHosts: [],
          activeRunWorkflowId: null,
          executingNodeId: null,
          isRunning: false,
        };
      },
    }
  )
);
