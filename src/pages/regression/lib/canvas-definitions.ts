import type React from 'react';
import { MarkerType } from '@xyflow/react';
import { StepNode } from '../nodes/step-node';

export const regressionNodeTypes = {
  regressionStep: StepNode,
};

export const regressionDefaultEdgeOptions = {
  animated: true,
  selectable: false,
  style: {
    stroke: 'var(--primary)',
    strokeWidth: 1.5,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: 'var(--primary)',
    width: 18,
    height: 18,
  },
};

export const regressionConnectionLineStyle: React.CSSProperties = {
  stroke: 'var(--primary)',
  strokeWidth: 2,
};
