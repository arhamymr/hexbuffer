import { MarkerType, type Connection } from '@xyflow/react';
import type { AutomationEdge } from '../types';

export const AUTOMATION_EDGE_STYLE = {
  stroke: 'hsl(var(--primary))',
  strokeWidth: 3,
};

export const AUTOMATION_MARKER_END = {
  type: MarkerType.ArrowClosed,
  color: 'hsl(var(--primary))',
  width: 20,
  height: 20,
};

export const automationDefaultEdgeOptions = {
  type: 'smoothstep' as const,
  animated: true,
  style: AUTOMATION_EDGE_STYLE,
  interactionWidth: 20,
  markerEnd: AUTOMATION_MARKER_END,
};

export function buildAutomationEdge(edge: Partial<AutomationEdge> & Pick<AutomationEdge, 'source' | 'target'>): AutomationEdge {
  return {
    ...automationDefaultEdgeOptions,
    ...edge,
    style: {
      ...AUTOMATION_EDGE_STYLE,
      ...(edge.style ?? {}),
    },
    markerEnd: {
      ...AUTOMATION_MARKER_END,
      ...((edge.markerEnd as object | undefined) ?? {}),
    },
    interactionWidth: edge.interactionWidth ?? automationDefaultEdgeOptions.interactionWidth,
  } as AutomationEdge;
}

export function buildAutomationEdgeFromConnection(connection: Connection): AutomationEdge {
  return buildAutomationEdge({
    ...connection,
    id: crypto.randomUUID(),
  });
}

export function normalizeAutomationEdges(edges: AutomationEdge[] = []): AutomationEdge[] {
  return edges.map((edge) => buildAutomationEdge(edge));
}
