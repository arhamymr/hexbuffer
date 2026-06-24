import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { X } from 'lucide-react';

export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = React.useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    window.dispatchEvent(new CustomEvent('automation-delete-edge', { detail: { edgeId: id } }));
  }, [id]);

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <button
          type="button"
          className="nodrag nopan absolute z-10 flex size-5 items-center justify-center rounded-full border border-destructive/40 bg-background text-destructive shadow hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          title="Delete wire"
          aria-label="Delete wire"
          onClick={handleDelete}
        >
          <X className="size-3" />
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
