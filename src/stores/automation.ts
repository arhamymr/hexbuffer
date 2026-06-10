import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  WorkflowDef,
  WorkflowRun,
  WorkflowRunStep,
} from '@/pages/automation/types';
import { DEFAULT_WORKFLOW_NAME } from '@/pages/automation/constants';

export interface ExecutionLog {
  id: string;
  workflowId: string;
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
  nodeId?: string;
  nodeLabel?: string;
}

interface AutomationState {
  workflows: WorkflowDef[];
  activeWorkflowId: string | null;
  isDirty: boolean;
  runHistory: WorkflowRun[];
  selectedRunId: string | null;
  selectedRunSteps: WorkflowRunStep[];
  isRunning: boolean;
  executingNodeId: string | null;
  executionLogs: ExecutionLog[];

  createWorkflow: () => string;
  loadWorkflow: (id: string) => void;
  saveWorkflow: (nodes: unknown, edges: unknown) => void;
  deleteWorkflow: (id: string) => void;
  deleteWorkflows: (ids: string[]) => void;
  renameWorkflow: (id: string, name: string) => void;
  setWorkflowName: (id: string, name: string) => void;
  toggleWorkflowEnabled: (id: string) => void;
  setActiveWorkflowId: (id: string | null) => void;

  runWorkflow: (workflowId: string) => Promise<void>;
  selectRun: (runId: string | null) => void;
  clearLogs: () => void;
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
      executingNodeId: null,
      executionLogs: [],

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

      runWorkflow: async (workflowId: string) => {
        const { workflows } = get();
        const workflow = workflows.find((w) => w.id === workflowId);
        if (!workflow) return;

        const addLog = (level: ExecutionLog['level'], message: string, nodeId?: string, nodeLabel?: string) => {
          set((state) => ({
            executionLogs: [
              ...state.executionLogs,
              {
                id: crypto.randomUUID(),
                workflowId,
                timestamp: new Date().toISOString(),
                level,
                message,
                nodeId,
                nodeLabel,
              },
            ],
          }));
        };

        set({ isRunning: true });
        addLog('info', `Starting workflow: ${workflow.name}`);

        const nodes = (workflow.nodes ?? []) as Array<{ id: string; type?: string; data?: { label?: string } }>;
        const edges = (workflow.edges ?? []) as Array<{ source: string; target: string }>;

        if (nodes.length === 0) {
          addLog('warning', 'Workflow has no nodes');
          set({ isRunning: false, executingNodeId: null });
          return;
        }

        // Find triggers (starting nodes)
        const targets = new Set(edges.map((e) => e.target));
        const triggers = nodes.filter((n) => !targets.has(n.id));

        if (triggers.length === 0) {
          addLog('warning', 'No trigger nodes found (nodes without incoming edges)');
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
          addLog('info', `Executing: ${label}`, nodeId, label);

          // Simulate step execution
          await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
          addLog('success', `Completed: ${label}`, nodeId, label);

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
            addLog('warning', `Skipped (unreachable): ${label}`, node.id, label);
          }
        }

        addLog('success', `Workflow completed: ${visited.size}/${nodes.length} nodes executed`);
        set({ isRunning: false, executingNodeId: null });
      },

      selectRun: (runId) => {
        set({ selectedRunId: runId });
      },

      clearLogs: () => set({ executionLogs: [] }),
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
        };
      },
    }
  )
);
