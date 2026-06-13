'use client';

import React from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import { Kbd } from '@/components/ui/kbd';
import type { AutomationNodeType, AutomationNodeData } from '../types';
import type { Node } from '@xyflow/react';
import { useWorkflowCanvas, type WorkflowCanvasBridge } from '../hooks/use-workflow-canvas';
import { CanvasContextMenu } from './canvas-context-menu';
import { NodeContextMenu } from './node-context-menu';

interface WorkflowCanvasProps {
  addNodeRef?: React.MutableRefObject<((nodeType: AutomationNodeType) => void) | null>;
  persistRef?: React.MutableRefObject<(() => void) | null>;
  onSelectedNodeChange?: (node: Node<AutomationNodeData> | null) => void;
  bridgeRef?: React.MutableRefObject<WorkflowCanvasBridge | null>;
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <div className="flex flex-col items-center gap-3">
        <span className="text-4xl opacity-20">⚡</span>
        <p className="text-sm">Select or create a workflow to start building</p>
      </div>
    </div>
  );
}

function CanvasCommandHelp() {
  return (
    <div className="pointer-events-none absolute bottom-1 left-12 z-30 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 rounded-md bg-background/90 px-2.5 py-1.5 text-[10px] text-muted-foreground backdrop-blur">
      <span className="flex items-center gap-1.5">
        <Kbd>Space</Kbd>
        Pan
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>Drag</Kbd>
        Select
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>Del</Kbd>
        Delete
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>Right click</Kbd>
        Menu
      </span>
    </div>
  );
}

export function WorkflowCanvas({ addNodeRef, persistRef, onSelectedNodeChange, bridgeRef }: WorkflowCanvasProps) {
  const canvas = useWorkflowCanvas(addNodeRef, persistRef, onSelectedNodeChange, bridgeRef);
  const [spacePressed, setSpacePressed] = React.useState(false);

  React.useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || isEditableTarget(event.target)) return;
      event.preventDefault();
      setSpacePressed(true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      event.preventDefault();
      setSpacePressed(false);
    };

    const handleBlur = () => setSpacePressed(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  if (!canvas.activeWorkflowId) {
    return <EmptyState />;
  }

  return (
    <div
      ref={canvas.reactFlowWrapper}
      className={cn('h-full w-full relative', spacePressed && 'automation-flow-pan-mode')}
    >
      <ReactFlow
        className="automation-flow"
        nodes={canvas.nodes}
        edges={canvas.edges}
        onNodesChange={canvas.onNodesChange}
        onEdgesChange={canvas.onEdgesChange}
        onConnect={canvas.onConnect}
        isValidConnection={canvas.isValidConnection}
        onEdgeDoubleClick={canvas.onEdgeDoubleClick}
        onPaneContextMenu={canvas.onPaneContextMenu}
        onNodeContextMenu={canvas.onNodeContextMenu}
        onNodeClick={canvas.onNodeClick}
        onPaneClick={canvas.onPaneClick}
        nodeTypes={canvas.nodeTypes}
        edgeTypes={canvas.edgeTypes}
        defaultEdgeOptions={canvas.defaultEdgeOptions}
        connectionLineStyle={canvas.connectionLineStyle}
        panOnDrag={spacePressed}
        selectionOnDrag={!spacePressed}
        panOnScroll
        onlyRenderVisibleElements
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

      <CanvasCommandHelp />

      <CanvasContextMenu
        state={canvas.contextMenu}
        onClose={canvas.closeContextMenu}
        onAddNode={canvas.addNodeFromMenu}
        hasTriggerNode={canvas.hasTriggerNode}
        onRemoveTrigger={canvas.removeTriggerNode}
      />

      <NodeContextMenu
        state={canvas.nodeContextMenu}
        onClose={canvas.closeNodeContextMenu}
        onDelete={canvas.deleteNode}
        onProperties={(nodeId) => canvas.setSelectedNodeId(nodeId)}
      />
    </div>
  );
}
