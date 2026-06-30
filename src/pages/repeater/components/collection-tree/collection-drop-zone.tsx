import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface CollectionDropZoneProps {
  stashId: string;
  isActive: boolean;
  isDragging: boolean;
  onAddChild: (parentId: string) => void;
}

export function CollectionDropZone({ stashId, isActive, isDragging, onAddChild }: CollectionDropZoneProps) {
  const droppableId = `dropzone-${stashId}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { stashId, kind: 'drop-zone' },
  });

  const showVisual = isDragging && (isActive || isOver);

  return (
    <div
      ref={setNodeRef}
      id={droppableId}
      className={cn(
        'mx-2 rounded-sm transition-all duration-200 ease-out',
        showVisual
          ? 'h-9 my-0.5 border border-dashed flex items-center justify-center ' +
            (isOver
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-muted-foreground/20')
          : isDragging
            ? 'h-1 my-0 border border-transparent'
            : 'h-16 my-1 flex flex-col items-center justify-center gap-1.5',
      )}
    >
      {showVisual && (
        <span className="text-[10px] text-muted-foreground/40">
          Drop here
        </span>
      )}

      {!isDragging && (
        <>
          <span className="text-[10px] text-muted-foreground/40">
            No endpoints yet
          </span>
          <button
            type="button"
            className="text-[10px] text-muted-foreground/50 hover:text-primary/70 transition-colors underline underline-offset-2"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(stashId);
            }}
          >
            Create one now
          </button>
        </>
      )}
    </div>
  );
}
