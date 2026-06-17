'use client';

import React from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RegressionStepNodeData } from '../nodes/step-node';
import type { TestStep } from '../types';
import {
  regressionConnectionLineStyle,
  regressionDefaultEdgeOptions,
  regressionNodeTypes,
} from '../lib/canvas-definitions';

interface StepFlowCanvasProps {
  steps: TestStep[];
  stepUiIds: string[];
  layoutVersion: number;
  selectedStepIndex: number | null;
  onSelectedStepChange: (index: number | null) => void;
  onStepRemove: (index: number) => void;
  onStepMove: (from: number, to: number) => void;
  onAddStep: () => void;
}

const NODE_WIDTH = 260;
const NODE_GAP = 88;
const NODE_Y = 64;

function getDefaultPosition(index: number) {
  return {
    x: 48 + index * (NODE_WIDTH + NODE_GAP),
    y: NODE_Y,
  };
}

function buildRegressionEdge(source: string, target: string, index: number): Edge {
  return {
    id: `regression-edge-${source}-${target}-${index}`,
    source,
    target,
    ...regressionDefaultEdgeOptions,
  };
}

export function StepFlowCanvas({
  steps,
  stepUiIds,
  layoutVersion,
  selectedStepIndex,
  onSelectedStepChange,
  onStepRemove,
  onStepMove,
  onAddStep,
}: StepFlowCanvasProps) {
  const reactFlowWrapper = React.useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<RegressionStepNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const lastLayoutVersionRef = React.useRef(layoutVersion);

  React.useEffect(() => {
    const shouldRelayout = lastLayoutVersionRef.current !== layoutVersion;
    lastLayoutVersionRef.current = layoutVersion;

    setNodes((currentNodes) => {
      const currentById = new Map(currentNodes.map((node) => [node.id, node]));
      return steps.map((step, index) => {
        const id = stepUiIds[index] ?? `regression-step-${index}`;
        const previousNode = currentById.get(id);
        return {
          id,
          type: 'regressionStep',
          position: shouldRelayout ? getDefaultPosition(index) : previousNode?.position ?? getDefaultPosition(index),
          selected: selectedStepIndex === index,
          data: {
            step,
            index,
            totalSteps: steps.length,
            onSelect: onSelectedStepChange,
            onRemove: onStepRemove,
            onMove: onStepMove,
          },
        };
      });
    });

    setEdges(
      steps.slice(0, -1).map((_, index) =>
        buildRegressionEdge(
          stepUiIds[index] ?? `regression-step-${index}`,
          stepUiIds[index + 1] ?? `regression-step-${index + 1}`,
          index,
        )
      )
    );
  }, [
    onSelectedStepChange,
    onStepMove,
    onStepRemove,
    layoutVersion,
    selectedStepIndex,
    setEdges,
    setNodes,
    stepUiIds,
    steps,
  ]);

  React.useEffect(() => {
    if (steps.length === 0) return;
    const frame = window.requestAnimationFrame(() => {
      fitView({ padding: 0.18, duration: 200 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fitView, steps.length]);

  return (
    <div ref={reactFlowWrapper} className="relative h-full w-full">
      <ReactFlow
        className="regression-flow"
        nodes={nodes}
        edges={edges}
        nodeTypes={regressionNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => {
          const index = nodes.findIndex((currentNode) => currentNode.id === node.id);
          if (index >= 0) onSelectedStepChange(index);
        }}
        onPaneClick={() => onSelectedStepChange(null)}
        defaultEdgeOptions={regressionDefaultEdgeOptions}
        connectionLineStyle={regressionConnectionLineStyle}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnScroll
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={null}
      >
        <Controls
          className="!rounded-md !border !bg-background !shadow-sm"
          position="bottom-right"
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="hsl(var(--muted-foreground) / 0.08)"
        />
        <MiniMap
          className="!rounded-md !border !shadow-sm"
          nodeStrokeWidth={2}
          pannable
          zoomable
        />
      </ReactFlow>

      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border bg-background/90 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
        Drag nodes to organize. Use arrows to change execution order.
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onAddStep}
        className="absolute bottom-3 left-3 z-10 gap-1 bg-background/90 backdrop-blur"
      >
        <Plus className="size-3.5" />
        Add Step
      </Button>
    </div>
  );
}
