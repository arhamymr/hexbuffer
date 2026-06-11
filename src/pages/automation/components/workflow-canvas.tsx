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
import type { AutomationNodeType } from '../types';
import { useWorkflowCanvas } from '../hooks/use-workflow-canvas';
import { CanvasContextMenu } from './canvas-context-menu';
import { NodeConfigPanel } from './node-config-panel';

interface WorkflowCanvasProps {
  addNodeRef?: React.MutableRefObject<((nodeType: AutomationNodeType) => void) | null>;
  persistRef?: React.MutableRefObject<(() => void) | null>;
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

export function WorkflowCanvas({ addNodeRef, persistRef }: WorkflowCanvasProps) {
  const canvas = useWorkflowCanvas(addNodeRef, persistRef);

  if (!canvas.activeWorkflowId) {
    return <EmptyState />;
  }

  return (
    <div ref={canvas.reactFlowWrapper} className="h-full w-full relative">
      <ReactFlow
        className="automation-flow"
        nodes={canvas.nodes}
        edges={canvas.edges}
        onNodesChange={canvas.onNodesChange}
        onEdgesChange={canvas.onEdgesChange}
        onConnect={canvas.onConnect}
        onPaneContextMenu={canvas.onPaneContextMenu}
        onNodeClick={canvas.onNodeClick}
        onPaneClick={canvas.onPaneClick}
        nodeTypes={canvas.nodeTypes}
        defaultEdgeOptions={canvas.defaultEdgeOptions}
        connectionLineStyle={canvas.connectionLineStyle}
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

      {/* Floating node config panel */}
      <div
        className={cn(
          'absolute right-0 top-0 z-50 h-full w-80 border-l bg-background shadow-lg transition-transform duration-200',
          canvas.selectedNodeId ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <NodeConfigPanel
          node={canvas.selectedNode}
          onClose={() => canvas.setSelectedNodeId(null)}
          onUpdate={canvas.updateNodeData}
          onRun={canvas.onRun}
        />
      </div>

      {/* Backdrop when panel is open */}
      {canvas.selectedNodeId && (
        <div
          className="absolute inset-0 z-40"
          onClick={() => canvas.setSelectedNodeId(null)}
        />
      )}

      <CanvasContextMenu
        state={canvas.contextMenu}
        onClose={canvas.closeContextMenu}
        onAddNode={canvas.addNodeFromMenu}
      />
    </div>
  );
}
