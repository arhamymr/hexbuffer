'use client';

import React from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Connection,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
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
import type { Node } from '@xyflow/react';
import { useDnD } from './dnd-context';
import { CanvasContextMenu } from './canvas-context-menu';
import { NodeConfigPanel } from './node-config-panel';

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
    zIndex: 1000,
  },
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

export function WorkflowCanvas() {
  const reactFlowWrapper = React.useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const { type: dndType, setType, setAddNodeAtCenter } = useDnD();

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
    setAddNodeAtCenter(() => (nodeType: AutomationNodeType) => {
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
    });
    return () => setAddNodeAtCenter(null);
  }, [setAddNodeAtCenter, screenToFlowPosition, setNodes]);

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
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const onDragOver = React.useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = React.useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      // Read from dataTransfer (always fresh) then fall back to context ref
      const nodeType =
        (event.dataTransfer.getData('text/plain') as AutomationNodeType) || dndType;
      setType(null);

      if (!nodeType || !NODE_TYPE_REGISTRY[nodeType]) return;

      const def = NODE_TYPE_REGISTRY[nodeType];
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
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
    },
    [screenToFlowPosition, setNodes, dndType, setType]
  );

  if (!activeWorkflowId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl opacity-20">⚡</span>
          <p className="text-sm">Select or create a workflow to start building</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={reactFlowWrapper} className="h-full w-full">
      {selectedNodeId ? (
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          <ResizablePanel defaultSize={65} minSize={40}>
            <div className="relative h-full">
              <style>{`.react-flow__attribution { display: none !important; }`}</style>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onPaneContextMenu={onPaneContextMenu}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                connectionLineStyle={connectionLineStyle}
                fitView
                snapToGrid
                snapGrid={[16, 16]}
                deleteKeyCode={['Backspace', 'Delete']}
              >
                <Controls
                  className="!rounded-lg !border !bg-background !shadow-sm"
                  position="bottom-right"
                />
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1}
                  color="hsl(var(--muted-foreground) / 0.08)"
                />
                <MiniMap
                  className="!rounded-lg !border !shadow-sm"
                  nodeStrokeWidth={2}
                  pannable
                  zoomable
                />
              </ReactFlow>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={35} minSize={20} maxSize={50}>
            <div className="h-full min-h-0">
              <NodeConfigPanel
                node={selectedNode}
                onClose={() => setSelectedNodeId(null)}
                onUpdate={updateNodeData}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <>
          <style>{`.react-flow__attribution { display: none !important; }`}</style>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onPaneContextMenu={onPaneContextMenu}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionLineStyle={connectionLineStyle}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Controls
              className="!rounded-lg !border !bg-background !shadow-sm"
              position="bottom-right"
            />
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="hsl(var(--muted-foreground) / 0.08)"
            />
            <MiniMap
              className="!rounded-lg !border !shadow-sm"
              nodeStrokeWidth={2}
              pannable
              zoomable
            />
          </ReactFlow>
        </>
      )}

      <CanvasContextMenu
        state={contextMenu}
        onClose={closeContextMenu}
        onAddNode={addNodeFromMenu}
      />
    </div>
  );
}
