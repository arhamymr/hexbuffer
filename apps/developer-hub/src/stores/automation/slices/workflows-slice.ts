import type { WorkflowDef } from '@/pages/automation/types';
import { DEFAULT_WORKFLOW_NAME } from '@/pages/automation/constants';
import { createWorkflowFromTemplate as buildFromTemplate } from '@/pages/automation/templates';
import { removeRunningWorkflowId } from '../constants';
import type { AutomationState } from '../types';

export interface WorkflowsSlice {
  workflows: WorkflowDef[];
  activeWorkflowId: string | null;
  isDirty: boolean;

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
}

export const createWorkflowsSlice = (
  set: (partial: Partial<AutomationState> | ((state: AutomationState) => Partial<AutomationState>)) => void,
  get: () => AutomationState
): WorkflowsSlice => ({
  workflows: [],
  activeWorkflowId: null,
  isDirty: false,

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
    get().saveWorkflowById(activeWorkflowId, nodes, edges);
  },

  saveWorkflowById: (workflowId, nodes, edges) => {
    const now = new Date().toISOString();
    set((state) => ({
      workflows: state.workflows.map((w) =>
        w.id === workflowId
          ? { ...w, nodes: nodes as WorkflowDef['nodes'], edges: edges as WorkflowDef['edges'], updatedAt: now }
          : w
      ),
      isDirty: false,
    }));
  },

  deleteWorkflow: (id) => {
    get().abortWorkflow(id, 'deleted');
    set((state) => {
      const filtered = state.workflows.filter((w) => w.id !== id);
      const runningWorkflowIds = removeRunningWorkflowId(state.runningWorkflowIds, id);
      const deletedWorkflow = state.workflows.find((w) => w.id === id);
      const deletedNodeIds = new Set((deletedWorkflow?.nodes ?? []).map((node) => node.id));
      const nextActive =
        state.activeWorkflowId === id
          ? filtered[0]?.id ?? null
          : state.activeWorkflowId;
      const nodeRuntimeById = Object.fromEntries(
        Object.entries(state.nodeRuntimeById).filter(([, runtime]) => runtime.workflowId !== id)
      );
      const workflowRuntimeById = Object.fromEntries(
        Object.entries(state.workflowRuntimeById).filter(([workflowId]) => workflowId !== id)
      );
      const liveTrafficQueueStatsByTriggerId = Object.fromEntries(
        Object.entries(state.liveTrafficQueueStatsByTriggerId).filter(
          ([triggerNodeId]) => !deletedNodeIds.has(triggerNodeId)
        )
      );
      return {
        workflows: filtered,
        activeWorkflowId: nextActive,
        activeRunWorkflowId:
          state.activeRunWorkflowId === id
            ? runningWorkflowIds[0] ?? null
            : state.activeRunWorkflowId,
        runningWorkflowIds,
        isRunning: runningWorkflowIds.length > 0,
        executingNodeId:
          state.executingNodeId && state.nodeRuntimeById[state.executingNodeId]?.workflowId === id
            ? null
            : state.executingNodeId,
        nodeRuntimeById,
        workflowRuntimeById,
        executionLogsByWorkflowId: Object.fromEntries(
          Object.entries(state.executionLogsByWorkflowId).filter(([workflowId]) => workflowId !== id)
        ),
        liveTrafficHostInsights: state.liveTrafficHostInsights.filter((item) => item.workflowId !== id),
        liveTrafficCapturedHosts: state.liveTrafficCapturedHosts.filter((item) => item.workflowId !== id),
        liveTrafficPreviewByTriggerId: Object.fromEntries(
          Object.entries(state.liveTrafficPreviewByTriggerId).filter(
            ([triggerNodeId]) => !deletedNodeIds.has(triggerNodeId)
          )
        ),
        liveTrafficCapturedPreviewByTriggerId: Object.fromEntries(
          Object.entries(state.liveTrafficCapturedPreviewByTriggerId).filter(
            ([triggerNodeId]) => !deletedNodeIds.has(triggerNodeId)
          )
        ),
        liveTrafficQueueStatsByTriggerId,
        isDirty: false,
      };
    });
  },

  deleteWorkflows: (ids) => {
    get().abortWorkflows(ids, 'deleted');
    set((state) => {
      const idSet = new Set(ids);
      const filtered = state.workflows.filter((w) => !idSet.has(w.id));
      const runningWorkflowIds = state.runningWorkflowIds.filter((id) => !idSet.has(id));
      const deletedNodeIds = new Set(
        state.workflows
          .filter((workflow) => idSet.has(workflow.id))
          .flatMap((workflow) => (workflow.nodes ?? []).map((node) => node.id))
      );
      const nextActive =
        state.activeWorkflowId && idSet.has(state.activeWorkflowId)
          ? filtered[0]?.id ?? null
          : state.activeWorkflowId;
      const nodeRuntimeById = Object.fromEntries(
        Object.entries(state.nodeRuntimeById).filter(([, runtime]) => !idSet.has(runtime.workflowId))
      );
      const workflowRuntimeById = Object.fromEntries(
        Object.entries(state.workflowRuntimeById).filter(([workflowId]) => !idSet.has(workflowId))
      );
      const liveTrafficQueueStatsByTriggerId = Object.fromEntries(
        Object.entries(state.liveTrafficQueueStatsByTriggerId).filter(
          ([triggerNodeId]) => !deletedNodeIds.has(triggerNodeId)
        )
      );
      return {
        workflows: filtered,
        activeWorkflowId: nextActive,
        activeRunWorkflowId:
          state.activeRunWorkflowId && idSet.has(state.activeRunWorkflowId)
            ? runningWorkflowIds[0] ?? null
            : state.activeRunWorkflowId,
        runningWorkflowIds,
        isRunning: runningWorkflowIds.length > 0,
        executingNodeId:
          state.executingNodeId && state.nodeRuntimeById[state.executingNodeId] && idSet.has(state.nodeRuntimeById[state.executingNodeId].workflowId)
            ? null
            : state.executingNodeId,
        nodeRuntimeById,
        workflowRuntimeById,
        executionLogsByWorkflowId: Object.fromEntries(
          Object.entries(state.executionLogsByWorkflowId).filter(([workflowId]) => !idSet.has(workflowId))
        ),
        liveTrafficHostInsights: state.liveTrafficHostInsights.filter((item) => !idSet.has(item.workflowId)),
        liveTrafficCapturedHosts: state.liveTrafficCapturedHosts.filter((item) => !idSet.has(item.workflowId)),
        liveTrafficPreviewByTriggerId: Object.fromEntries(
          Object.entries(state.liveTrafficPreviewByTriggerId).filter(
            ([triggerNodeId]) => !deletedNodeIds.has(triggerNodeId)
          )
        ),
        liveTrafficCapturedPreviewByTriggerId: Object.fromEntries(
          Object.entries(state.liveTrafficCapturedPreviewByTriggerId).filter(
            ([triggerNodeId]) => !deletedNodeIds.has(triggerNodeId)
          )
        ),
        liveTrafficQueueStatsByTriggerId,
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
});
