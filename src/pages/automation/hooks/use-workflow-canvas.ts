'use client';

import React from 'react';
import {
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  MarkerType,
  type Connection,
} from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { useAutomationStore } from '@/stores/automation';
import { TriggerNode } from '../nodes/trigger-node';
import { ConditionNode } from '../nodes/condition-node';
import { ActionNode } from '../nodes/action-node';
import { NODE_TYPE_REGISTRY, makeNodeId } from '../constants';
import type {
  AutomationNodeType,
  AutomationNodeData,
  AutomationNode,
  NodeConfig,
} from '../types';

const nodeTypes = {
  'trigger:new-request': TriggerNode,
  'trigger:new-response': TriggerNode,
  'trigger:finding-created': TriggerNode,
  'trigger:scan-completed': TriggerNode,
  'trigger:scheduled': TriggerNode,
  'trigger:manual': TriggerNode,
  'trigger:browser-page-crawled': TriggerNode,
  'trigger:intercept-request': TriggerNode,
  'trigger:websocket-message': TriggerNode,
  'trigger:port-scan-result': TriggerNode,
  'trigger:inspector-connected': TriggerNode,
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

const defaultEdgeOptions = {
  type: 'smoothstep' as const,
  animated: true,
  style: {
    stroke: 'hsl(var(--primary))',
    strokeWidth: 3,
  },
  interactionWidth: 20,
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: 'hsl(var(--primary))',
    width: 20,
    height: 20,
  },
};

const connectionLineStyle: React.CSSProperties = {
  stroke: 'hsl(var(--primary))',
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
  const saveWorkflow = useAutomationStore((s) => s.saveWorkflow);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    (workflow?.nodes ?? []) as unknown as Node[]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow?.edges ?? []);

  const persist = React.useCallback(() => {
    saveWorkflow(nodes, edges);
  }, [nodes, edges, saveWorkflow]);

  // Context menu state
  const [contextMenu, setContextMenu] = React.useState<{
    x: number;
    y: number;
    flowX: number;
    flowY: number;
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
      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
      });
    },
    [screenToFlowPosition]
  );

  const closeContextMenu = React.useCallback(() => {
    setContextMenu(null);
  }, []);

  const onNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    []
  );

  const onPaneClick = React.useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const updateNodeData = React.useCallback(
    (nodeId: string, data: AutomationNodeData) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== nodeId) return n;
          return { ...n, data: data as unknown as Record<string, unknown> };
        })
      );
    },
    [setNodes]
  );

  const addNodeFromMenu = React.useCallback(
    (nodeType: AutomationNodeType, flowX: number, flowY: number) => {
      const def = NODE_TYPE_REGISTRY[nodeType];
      if (!def) return;

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

      setNodes((nds) => [...nds, newNode as unknown as Node]);
      setContextMenu(null);
    },
    [setNodes]
  );

  // Register addNodeAtCenter so palette can trigger it
  React.useEffect(() => {
    if (!addNodeRef) return;
    addNodeRef.current = (nodeType: AutomationNodeType) => {
      const def = NODE_TYPE_REGISTRY[nodeType];
      if (!def) return;
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
      setNodes((nds) => [...nds, newNode as unknown as Node]);
    };
    return () => {
      if (addNodeRef) addNodeRef.current = null;
    };
  }, [addNodeRef, screenToFlowPosition, setNodes]);

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
      setEdges((eds) => addEdge({ ...connection, ...defaultEdgeOptions }, eds));
    },
    [setEdges]
  );

  return {
    // core state
    reactFlowWrapper,
    activeWorkflowId,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    // context menu
    contextMenu,
    closeContextMenu,
    // selected node
    selectedNodeId,
    selectedNode,
    setSelectedNodeId,
    // callbacks
    onConnect,
    onPaneContextMenu,
    onNodeClick,
    onPaneClick,
    updateNodeData,
    addNodeFromMenu,
    // config
    nodeTypes,
    defaultEdgeOptions,
    connectionLineStyle,
  };
}
