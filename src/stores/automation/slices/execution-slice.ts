import { toast } from 'sonner';
import type { WorkflowRun, WorkflowRunStep } from '@/pages/automation/types';
import { getWorkflowReadiness } from '@/pages/automation/lib/workflow-readiness';
import { writeDocument } from '@/triggers/documents';
import {
  addRunningWorkflowId,
  removeRunningWorkflowId,
  workflowAbortControllers,
  workflowAbortReasons,
  workflowAbortLogged,
  abortReasonFor,
  capExecutionLogs,
} from '../constants';
import type { AutomationState, ExecutionLog, NodeRuntimeStatus, WorkflowContext } from '../types';

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
      return;
    }

    const previousController = workflowAbortControllers.get(workflowId);
    if (previousController && !previousController.signal.aborted) {
      workflowAbortReasons.set(workflowId, 'superseded by a new run');
      previousController.abort('superseded by a new run');
    }

    const abortController = new AbortController();
    workflowAbortControllers.set(workflowId, abortController);
    workflowAbortReasons.delete(workflowId);
    workflowAbortLogged.delete(workflowId);
    const signal = abortController.signal;

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
      runtimeStatus?: NodeRuntimeStatus,
      inputData?: unknown,
      outputData?: unknown
    ) => {
      get().appendExecutionLog(
        {
          workflowId,
          level,
          message,
          nodeId,
          nodeLabel,
          inputData,
          outputData,
        },
        runtimeStatus
      );
    };

    const isAborted = () => signal.aborted;
    const abortMessage = () => `Workflow aborted: ${abortReasonFor(workflowId)}`;
    const logAbortOnce = () => {
      if (workflowAbortLogged.has(workflowId)) return;
      workflowAbortLogged.add(workflowId);
      addLog('warning', abortMessage());
    };

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const timeout = window.setTimeout(resolve, ms);
        signal.addEventListener(
          'abort',
          () => {
            window.clearTimeout(timeout);
            resolve();
          },
          { once: true }
        );
      });

    const finishWorkflowRun = (aborted: boolean) => {
      if (workflowAbortControllers.get(workflowId) === abortController) {
        workflowAbortControllers.delete(workflowId);
        workflowAbortReasons.delete(workflowId);
        workflowAbortLogged.delete(workflowId);
      }
      set((state) => {
        const runningWorkflowIds = removeRunningWorkflowId(state.runningWorkflowIds, workflowId);
        const activeRunWorkflowId =
          state.activeRunWorkflowId === workflowId
            ? runningWorkflowIds[0] ?? null
            : state.activeRunWorkflowId;
        const nodeRuntimeById = Object.fromEntries(
          Object.entries(state.nodeRuntimeById).map(([nodeId, runtime]) => [
            nodeId,
            runtime.workflowId === workflowId && runtime.status === 'running'
              ? {
                  ...runtime,
                  status: aborted ? 'skipped' as const : 'error' as const,
                  message: aborted ? abortMessage() : 'Workflow stopped before this node finished',
                  updatedAt: new Date().toISOString(),
                }
              : runtime,
          ])
        );
        return {
          runningWorkflowIds,
          isRunning: runningWorkflowIds.length > 0,
          activeRunWorkflowId,
          executingNodeId: state.activeRunWorkflowId === workflowId ? null : state.executingNodeId,
          nodeRuntimeById,
        };
      });
    };

    get().clearWorkflowRuntimeStatus(workflowId);
    set((state) => {
      const runningWorkflowIds = addRunningWorkflowId(state.runningWorkflowIds, workflowId);
      return {
        runningWorkflowIds,
        isRunning: true,
        activeRunWorkflowId: workflowId,
        executingNodeId: null,
      };
    });

    try {
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
      let aborted = false;

      for (const nodeId of queue) {
        if (isAborted()) {
          aborted = true;
          break;
        }
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        const label = node.data?.label ?? node.type ?? 'Unknown';
        set({ executingNodeId: nodeId });
        addLog('info', `Executing: ${label}`, nodeId, label, 'running');

        // ── Real action execution ──
        if (node.type === 'action:add-to-report') {
          if (isAborted()) {
            aborted = true;
            break;
          }
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
              if (isAborted()) {
                aborted = true;
                break;
              }
              addLog('success', context?.data ? `Report updated (with context)` : `Report updated`, nodeId, label, 'success', undefined, { section: p.section, title: resolvedTitle, mode: p.mode || 'append' });
            } catch (err) {
              const message = `Failed: ${err instanceof Error ? err.message : 'unknown'}`;
              addLog('error', message, nodeId, label, 'error');
              toast.error(message);
            }
          }
        } else if (node.type?.startsWith('trigger:')) {
          // Trigger node — log the incoming context data
          const triggerInputData = context?.data ?? null;
          if (context?.data) {
            const host = context.data.host;
            addLog('info', `Trigger host: ${typeof host === 'string' && host ? host : '(unknown)'}`, nodeId, label, 'running', triggerInputData);
          } else {
            addLog('info', `Trigger activated`, nodeId, label, 'running');
          }
          if (isAborted()) {
            aborted = true;
            break;
          }
          addLog('success', `Triggered: ${label}`, nodeId, label, 'success');
        } else {
          // Simulate step execution for other node types
          await wait(300 + Math.random() * 400);
          if (isAborted()) {
            aborted = true;
            break;
          }
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

      if (aborted || isAborted()) {
        logAbortOnce();
        return;
      }

      // Log any unvisited nodes
      for (const node of nodes) {
        if (!visited.has(node.id)) {
          const label = node.data?.label ?? node.type ?? 'Unknown';
          addLog('warning', `Skipped (unreachable): ${label}`, node.id, label, 'skipped');
        }
      }

      addLog('success', `Workflow completed: ${visited.size}/${nodes.length} nodes executed`);
    } catch (err) {
      if (isAborted()) {
        logAbortOnce();
        return;
      }
      const message = `Workflow failed: ${err instanceof Error ? err.message : 'unknown error'}`;
      addLog('error', message);
      toast.error(message);
    } finally {
      finishWorkflowRun(isAborted());
    }
  },

  abortWorkflow: (workflowId, reason = 'stopped') => {
    const controller = workflowAbortControllers.get(workflowId);
    workflowAbortReasons.set(workflowId, reason);
    if (controller && !controller.signal.aborted) {
      controller.abort(reason);
    }

    set((state) => {
      const runningWorkflowIds = removeRunningWorkflowId(state.runningWorkflowIds, workflowId);
      const isKnownRun = state.runningWorkflowIds.includes(workflowId) || Boolean(controller);
      const timestamp = new Date().toISOString();
      if (isKnownRun) {
        workflowAbortLogged.add(workflowId);
      }
      const nodeRuntimeById = Object.fromEntries(
        Object.entries(state.nodeRuntimeById).map(([nodeId, runtime]) => [
          nodeId,
          runtime.workflowId === workflowId && runtime.status === 'running'
            ? {
                ...runtime,
                status: 'skipped' as const,
                message: `Workflow aborted: ${reason}`,
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
        executionLogs: isKnownRun
          ? capExecutionLogs([
              ...state.executionLogs,
              {
                id: crypto.randomUUID(),
                workflowId,
                timestamp,
                level: 'warning' as const,
                message: `Workflow aborted: ${reason}`,
              },
            ])
          : state.executionLogs,
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
