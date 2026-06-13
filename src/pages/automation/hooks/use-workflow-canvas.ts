'use client';

import React from 'react';
import {
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { useAutomationStore } from '@/stores/automation';
import { TriggerNode } from '../nodes/trigger-node';
import { ConditionNode } from '../nodes/condition-node';
import { ActionNode } from '../nodes/action-node';
import { addOpenNodeContextMenuListener } from '../nodes/node-card-menu';
import { DeletableEdge } from '../components/deletable-edge';
import { NODE_TYPE_REGISTRY, makeNodeId } from '../constants';
import {
  automationDefaultEdgeOptions,
  buildAutomationEdgeFromConnection,
  keepOneAutomationEdgePerHandle,
  normalizeAutomationEdges,
} from '../lib/edges';
import { deleteConnectedWires } from '../lib/node-capabilities';
import type {
  AutomationNodeType,
  AutomationNodeData,
  AutomationNode,
  NodeConfig,
} from '../types';

const nodeTypes = {
  'trigger:scan-completed': TriggerNode,
  'trigger:scheduled': TriggerNode,
  'trigger:manual': TriggerNode,
  'trigger:browser-page-crawled': TriggerNode,
  'trigger:intercept-request': TriggerNode,
  'trigger:websocket-message': TriggerNode,
  'trigger:port-scan-result': TriggerNode,
  'trigger:live-traffic-captured': TriggerNode,
  'condition:status-code': ConditionNode,
  'condition:url-contains': ConditionNode,
  'condition:body-contains': ConditionNode,
  'condition:header-exists': ConditionNode,
  'condition:severity': ConditionNode,
  'condition:ai-confidence': ConditionNode,
  'condition:method': ConditionNode,
  'condition:content-type': ConditionNode,
  'condition:response-size': ConditionNode,
  'condition:crawl-status': ConditionNode,
  'condition:grep-match': ConditionNode,
  'condition:port-open': ConditionNode,
  'action:send-to-repeater': ActionNode,
  'action:ai-analyze': ActionNode,
  'action:create-finding': ActionNode,
  'action:add-to-report': ActionNode,
  'action:send-webhook': ActionNode,
  'action:show-notification': ActionNode,
  'action:run-script': ActionNode,
  'action:start-crawl': ActionNode,
  'action:stop-crawl': ActionNode,
  'action:send-to-intercept': ActionNode,
  'action:start-invoker': ActionNode,
  'action:port-scan': ActionNode,
  'action:encode-decode': ActionNode,
  'action:hash-data': ActionNode,
  'action:export-json': ActionNode,
  'action:create-document': ActionNode,
  'action:add-to-document': ActionNode,
  'action:connect-cdp': ActionNode,
  'action:script-analyze': ActionNode,
};

const edgeTypes = {
  deletable: DeletableEdge,
};

const connectionLineStyle: React.CSSProperties = {
  stroke: '#00c950',
  strokeWidth: 3,
};

export function useWorkflowCanvas(
  addNodeRef?: React.MutableRefObject<((nodeType: AutomationNodeType) => void) | null>,
  persistRef?: React.MutableRefObject<(() => void) | null>
) {
  const reactFlowWrapper = React.useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const activeWorkflowId = useAutomationStore((s) => s.activeWorkflowId);
  const workflow = useAutomationStore((s) =>
    s.workflows.find((w) => w.id === s.activeWorkflowId) ?? null
  );
  const saveWorkflowById = useAutomationStore((s) => s.saveWorkflowById);
  const runWorkflow = useAutomationStore((s) => s.runWorkflow);
  const workflowIdRef = React.useRef(activeWorkflowId);

  const [nodes, setNodes] = useNodesState(
    (workflow?.nodes ?? []) as unknown as Node[]
  );
  const [edges, setEdges] = useEdgesState(
    normalizeAutomationEdges(workflow?.edges ?? [])
  );
  const nodesRef = React.useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = React.useRef(edges);
  edgesRef.current = edges;

  const persist = React.useCallback((nextNodes = nodesRef.current, nextEdges = edgesRef.current) => {
    const workflowId = workflowIdRef.current;
    if (!workflowId) return;
    saveWorkflowById(workflowId, nextNodes, nextEdges);
  }, [saveWorkflowById]);

  // Run handler for manual trigger node
  const onRun = React.useCallback(() => {
    const workflowId = workflowIdRef.current;
    if (!workflowId) return;
    persist();
    const manualTrigger = nodesRef.current.find((node) => {
      const data = node.data as Partial<AutomationNodeData> | undefined;
      return node.type === 'trigger:manual' || data?.nodeType === 'trigger:manual';
    });
    runWorkflow(workflowId, {
      triggerType: 'trigger:manual',
      triggerNodeId: manualTrigger?.id,
      data: {
        triggeredAt: new Date().toISOString(),
        source: 'manual',
      },
    });
  }, [persist, runWorkflow]);

  // Auto-persist when switching tabs (component unmounts via key change).
  // Use a ref so the cleanup always calls the latest persist without
  // re-registering the effect on every state update.
  const persistRefForCleanup = React.useRef(persist);
  persistRefForCleanup.current = persist;
  React.useEffect(() => {
    return () => {
      persistRefForCleanup.current();
    };
  }, []);

  // Context menu state
  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
    flowX: number;
    flowY: number;
  } | null>(null);

  // Node context menu state
  const [nodeContextMenu, setNodeContextMenu] = React.useState<{
    x: number;
    y: number;
    nodeId: string;
    nodeLabel: string;
  } | null>(null);

  // Selected node for config panel
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);

  const selectedNode = React.useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null),
    [selectedNodeId, nodes]
  ) as Node<AutomationNodeData> | null;

  const onPaneContextMenu = React.useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const rect = reactFlowWrapper.current?.getBoundingClientRect();
      if (!rect) return;
      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const menuWidth = 224;
      const menuHeight = 360;
      const relativeX = event.clientX - rect.left;
      const relativeY = event.clientY - rect.top;
      setContextMenu({
        x: Math.min(Math.max(relativeX, 8), Math.max(rect.width - menuWidth - 8, 8)),
        y: Math.min(Math.max(relativeY, 8), Math.max(rect.height - menuHeight - 8, 8)),
        flowX: flowPos.x,
        flowY: flowPos.y,
      });
    },
    [screenToFlowPosition]
  );

  const closeContextMenu = React.useCallback(() => {
    setContextMenu(null);
  }, []);

  const onNodeContextMenu = React.useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const rect = reactFlowWrapper.current?.getBoundingClientRect();
      if (!rect) return;
      const nodeData = node.data as unknown as { label?: string };
      setNodeContextMenu({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        nodeId: node.id,
        nodeLabel: nodeData.label ?? node.type ?? 'Node',
      });
    },
    []
  );

  React.useEffect(() => {
    return addOpenNodeContextMenuListener(({ nodeId, nodeLabel, clientX, clientY }) => {
      const rect = reactFlowWrapper.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 176;
      const menuHeight = 96;
      const relativeX = clientX - rect.left;
      const relativeY = clientY - rect.top;
      setContextMenu(null);
      setNodeContextMenu({
        x: Math.min(Math.max(relativeX, 8), Math.max(rect.width - menuWidth - 8, 8)),
        y: Math.min(Math.max(relativeY, 8), Math.max(rect.height - menuHeight - 8, 8)),
        nodeId,
        nodeLabel,
      });
    });
  }, []);

  const closeNodeContextMenu = React.useCallback(() => {
    setNodeContextMenu(null);
  }, []);

  const onNodeClick = React.useCallback(() => {
    setContextMenu(null);
    setNodeContextMenu(null);
  }, []);

  const onPaneClick = React.useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const updateNodeData = React.useCallback(
    (nodeId: string, data: AutomationNodeData) => {
      setNodes((nds) => {
        const nextNodes = nds.map((n) => {
          if (n.id !== nodeId) return n;
          return { ...n, data: data as unknown as Record<string, unknown> };
        });
        persist(nextNodes, edgesRef.current);
        return nextNodes;
      });
    },
    [persist, setNodes]
  );

  const addNodeFromMenu = React.useCallback(
    (nodeType: AutomationNodeType, flowX: number, flowY: number) => {
      const def = NODE_TYPE_REGISTRY[nodeType];
      if (!def) return;

      // Enforce single trigger per workflow
      if (nodeType.startsWith('trigger:')) {
        const existingTrigger = nodesRef.current.some((n) => (n.type as string)?.startsWith('trigger:'));
        if (existingTrigger) return;
      }

      const id = makeNodeId(nodeType);
      const newNode: AutomationNode = {
        id,
        type: nodeType,
        position: { x: flowX, y: flowY },
        data: {
          label: def.label,
          nodeType,
          category: def.category,
          config: def.defaultConfig as NodeConfig,
          iconName: def.iconName,
        },
      };

      setNodes((nds) => {
        const nextNodes = [...nds, newNode as unknown as Node];
        persist(nextNodes, edgesRef.current);
        return nextNodes;
      });
      setContextMenu(null);
    },
    [persist, setNodes]
  );

  // Register addNodeAtCenter so palette can trigger it
  React.useEffect(() => {
    if (!addNodeRef) return;
    addNodeRef.current = (nodeType: AutomationNodeType) => {
      const def = NODE_TYPE_REGISTRY[nodeType];
      if (!def) return;

      // Enforce single trigger per workflow
      if (nodeType.startsWith('trigger:')) {
        const existingTrigger = nodesRef.current.some((n) => (n.type as string)?.startsWith('trigger:'));
        if (existingTrigger) return;
      }

      const wrapper = reactFlowWrapper.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
      const id = makeNodeId(nodeType);
      const newNode: AutomationNode = {
        id,
        type: nodeType,
        position,
        data: {
          label: def.label,
          nodeType,
          category: def.category,
          config: def.defaultConfig as NodeConfig,
          iconName: def.iconName,
        },
      };
      setNodes((nds) => {
        const nextNodes = [...nds, newNode as unknown as Node];
        persist(nextNodes, edgesRef.current);
        return nextNodes;
      });
    };
    return () => {
      if (addNodeRef) addNodeRef.current = null;
    };
  }, [addNodeRef, persist, screenToFlowPosition, setNodes]);

  // Register persist so toolbar can save before running
  React.useEffect(() => {
    if (!persistRef) return;
    persistRef.current = persist;
    return () => {
      persistRef.current = null;
    };
  }, [persistRef, persist]);

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        persist();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [persist]);

  const onConnect = React.useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const sourceHandle = connection.sourceHandle ?? null;
        const targetHandle = connection.targetHandle ?? null;
        const connectionExistsOnHandle = eds.some(
          (edge) =>
            (edge.source === connection.source && (edge.sourceHandle ?? null) === sourceHandle) ||
            (edge.target === connection.target && (edge.targetHandle ?? null) === targetHandle)
        );
        if (connectionExistsOnHandle) return eds;

        const nextEdges = addEdge(buildAutomationEdgeFromConnection(connection), eds);
        persist(nodesRef.current, nextEdges);
        return nextEdges;
      });
    },
    [persist, setEdges]
  );

  const isValidConnection = React.useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return false;
    if (connection.source === connection.target) return false;

    const sourceHandle = connection.sourceHandle ?? null;
    const targetHandle = connection.targetHandle ?? null;
    return !edgesRef.current.some(
      (edge) =>
        (edge.source === connection.source && (edge.sourceHandle ?? null) === sourceHandle) ||
        (edge.target === connection.target && (edge.targetHandle ?? null) === targetHandle)
    );
  }, []);

  const deleteEdge = React.useCallback((edgeId: string) => {
    setEdges((eds) => {
      const nextEdges = eds.filter((edge) => edge.id !== edgeId);
      persist(nodesRef.current, nextEdges);
      return nextEdges;
    });
  }, [persist, setEdges]);

  const onEdgeDoubleClick = React.useCallback(
    (event: React.MouseEvent, edge: { id: string }) => {
      event.preventDefault();
      event.stopPropagation();
      deleteEdge(edge.id);
    },
    [deleteEdge]
  );

  React.useEffect(() => {
    const handleDeleteEdge = (event: Event) => {
      const edgeId = (event as CustomEvent<{ edgeId?: string }>).detail?.edgeId;
      if (!edgeId) return;
      deleteEdge(edgeId);
    };

    window.addEventListener('automation-delete-edge', handleDeleteEdge);
    return () => window.removeEventListener('automation-delete-edge', handleDeleteEdge);
  }, [deleteEdge]);

  const onNodesChange = React.useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => {
        const nextNodes = applyNodeChanges(changes, nds);
        persist(nextNodes, edgesRef.current);
        return nextNodes;
      });
    },
    [persist, setNodes]
  );

  const onEdgesChange = React.useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const nextEdges = keepOneAutomationEdgePerHandle(applyEdgeChanges(changes, eds));
        persist(nodesRef.current, nextEdges);
        return nextEdges;
      });
    },
    [persist, setEdges]
  );

  const hasTriggerNode = React.useMemo(
    () => nodes.some((n) => (n.type as string)?.startsWith('trigger:')),
    [nodes]
  );

  const removeTriggerNode = React.useCallback(() => {
    const triggerNode = nodesRef.current.find((n) => (n.type as string)?.startsWith('trigger:'));
    if (!triggerNode) return;
    const triggerId = triggerNode.id;
    const nextNodes = nodesRef.current.filter((n) => n.id !== triggerId);
    const nextEdges = deleteConnectedWires(triggerId, edgesRef.current);
    setNodes(nextNodes);
    setEdges(nextEdges);
    persist(nextNodes, nextEdges);
  }, [persist, setNodes, setEdges]);

  const deleteNode = React.useCallback((nodeId: string) => {
    const nextNodes = nodesRef.current.filter((n) => n.id !== nodeId);
    const nextEdges = deleteConnectedWires(nodeId, edgesRef.current);
    setNodes(nextNodes);
    setEdges(nextEdges);
    persist(nextNodes, nextEdges);
    setSelectedNodeId(null);
  }, [persist, setNodes, setEdges]);

  return {
    // core state
    reactFlowWrapper,
    activeWorkflowId,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    hasTriggerNode,
    removeTriggerNode,
    // context menu
    contextMenu,
    closeContextMenu,
    // node context menu
    nodeContextMenu,
    closeNodeContextMenu,
    onNodeContextMenu,
    // selected node
    selectedNodeId,
    selectedNode,
    setSelectedNodeId,
    // callbacks
    onConnect,
    isValidConnection,
    onEdgeDoubleClick,
    onPaneContextMenu,
    onNodeClick,
    onPaneClick,
    updateNodeData,
    addNodeFromMenu,
    deleteNode,
    onRun,
    // config
    nodeTypes,
    edgeTypes,
    defaultEdgeOptions: automationDefaultEdgeOptions,
    connectionLineStyle,
  };
}
