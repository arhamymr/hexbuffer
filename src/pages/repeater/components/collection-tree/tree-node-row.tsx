import React from 'react';
import { CaretDownIcon, DotsSixVerticalIcon, FileCodeIcon, FolderStarIcon, PlusIcon, TrashIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { FlatNode, DropAction } from './utils';
import { MethodBadge } from '@/components/status-badge';

// ── Props ──

export interface TreeNodeRowProps {
  node: FlatNode;
  isSelected: boolean;
  isExpanded: boolean;
  isDragOver: boolean;
  dropAction: DropAction | null;
  endpointCount: number;
  onSelect: (node: FlatNode) => void;
  onToggleExpand: (id: string) => void;
  onAddChild: (parentId: string, type: 'endpoint') => void;
  onRename: (node: FlatNode) => void;
  onDelete: (node: FlatNode) => void;
}

// ── Component ──

export function TreeNodeRow({
  node,
  isSelected,
  isExpanded,
  isDragOver,
  dropAction,
  endpointCount,
  onSelect,
  onToggleExpand,
  onAddChild,
  onRename,
  onDelete,
}: TreeNodeRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
    data: { flatNode: node },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  const isCollection = node.kind === 'collection';
  const isEndpoint = node.kind === 'endpoint';
  const Icon = isEndpoint ? FileCodeIcon : FolderStarIcon;
  const iconClass = isEndpoint
    ? 'text-gray-500'
    : 'text-blue-500';

  // Drop indicator classes
  const showBeforeLine = dropAction?.action === 'reorder-before';
  const showAfterLine = dropAction?.action === 'reorder-after';
  const showInsideHighlight = dropAction?.action === 'reparent';

  return (
    <div ref={setNodeRef} id={node.id} style={style} className="relative group/tree-row">
      {/* Drop indicator: insert-before line */}
      {showBeforeLine && (
        <div className="absolute -top-[1px] left-2 right-2 h-[2px] rounded-full bg-primary z-10" />
      )}

      {/* Drop indicator: insert-after line */}
      {showAfterLine && (
        <div className="absolute -bottom-[1px] left-2 right-2 h-[2px] rounded-full bg-primary z-10" />
      )}

      <div
        className={cn(
          'flex cursor-pointer items-center gap-1 rounded-sm py-0.5 transition-colors hover:bg-muted/50 group/tree-row',
          isSelected && 'bg-muted',
          isDragOver && showInsideHighlight && 'bg-primary/10 ring-1 ring-primary/30',
        )}
        style={{ paddingLeft: `${node.depth * 16 + 4}px` }}
        onClick={() => {
          // Endpoints: select as usual
          if (isEndpoint) {
            onSelect(node);
          }
          // Collections: clicking row toggles expand (override for chevron handled separately)
        }}
      >
        {/* Expand/Collapse Chevron */}
        {isCollection ? (
          <button
            type="button"
            className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            aria-label="Toggle expand"
          >
            <CaretDownIcon
              className={cn('size-3.5 transition-transform', !isExpanded && '-rotate-90')}
            />
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* Icon — clickable for collections to toggle expand */}
        <Icon
          className={cn(
            'h-3.5 w-3.5 flex-shrink-0',
            iconClass,
            isCollection && 'cursor-pointer hover:scale-110 transition-transform',
          )}
          onClick={(e) => {
            if (isCollection) {
              e.stopPropagation();
              onToggleExpand(node.id);
            }
          }}
        />

        {/* Label */}
        <div
          className={cn('min-w-0 flex-1', isCollection && 'cursor-pointer')}
          onClick={(e) => {
            if (isCollection) {
              e.stopPropagation();
              onToggleExpand(node.id);
            }
          }}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={cn('truncate text-xs', isEndpoint && 'font-mono')}>
              {node.label}
            </span>
            {/* Endpoint count badge for collections */}
            {isCollection && endpointCount > 0 && (
              <span className="shrink-0 text-[10px] leading-none text-muted-foreground/60 tabular-nums">
                {endpointCount}
              </span>
            )}
            {/* Method badge for endpoints */}
            {isEndpoint && node.method && (
              <MethodBadge
                method={node.method}
                className="text-[9px] px-1 py-px"
              />
            )}
          </div>
          {/* URL description for endpoints */}
          {node.description && isEndpoint && (
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {node.description}
            </div>
          )}
        </div>

        {/* Inline actions — visible on row hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover/tree-row:opacity-100 transition-opacity shrink-0 pr-1">
          {/* Add child — only for collections */}
          {isCollection && (
            <>
              <button
                type="button"
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                title="New Endpoint"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(node.originalId, 'endpoint');
                }}
              >
                <PlusIcon className="h-3 w-3" />
              </button>
            </>
          )}

          {/* Rename — collections */}
          {isCollection && (
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Rename"
              onClick={(e) => {
                e.stopPropagation();
                onRename(node);
              }}
            >
              <PencilSimpleIcon className="h-2.5 w-2.5" />
            </button>
          )}

          {/* Delete */}
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node);
            }}
          >
            <TrashIcon className="h-2.5 w-2.5" />
          </button>
        </div>

        {/* DotsSixIcon Handle — drag trigger, visible on hover */}
        <button
          type="button"
          className="flex h-5 w-4 flex-shrink-0 items-center justify-center rounded-sm text-muted-foreground/30 opacity-0 group-hover/tree-row:opacity-100 transition-opacity cursor-grab active:cursor-grabbing hover:text-muted-foreground touch-none"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <DotsSixVerticalIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
