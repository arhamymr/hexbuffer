import React from 'react';
import { ChevronDown, GripVertical, FileCode, FolderHeart, Plus, Trash2, Edit2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { FlatNode, DropAction } from './utils';

// ── Method badge colors ──

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-600',
  POST: 'bg-blue-500/10 text-blue-600',
  PUT: 'bg-amber-500/10 text-amber-600',
  DELETE: 'bg-red-500/10 text-red-600',
  PATCH: 'bg-purple-500/10 text-purple-600',
};

// ── Props ──

export interface TreeNodeRowProps {
  node: FlatNode;
  isSelected: boolean;
  isExpanded: boolean;
  isDragOver: boolean;
  dropAction: DropAction | null;
  onSelect: (node: FlatNode) => void;
  onToggleExpand: (id: string) => void;
  onAddChild: (parentId: string, type: 'folder' | 'endpoint') => void;
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

  const isFolder = node.kind === 'collection' || node.kind === 'folder';
  const isEndpoint = node.kind === 'endpoint';
  const Icon = isEndpoint ? FileCode : node.kind === 'collection' ? FolderHeart : FileCode;
  const iconClass = isEndpoint
    ? 'text-gray-500'
    : node.kind === 'collection'
    ? 'text-blue-500'
    : 'text-amber-500';

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
        onClick={() => onSelect(node)}
      >
        {/* Expand/Collapse Chevron */}
        {isFolder ? (
          <button
            type="button"
            className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            aria-label="Toggle expand"
          >
            <ChevronDown
              className={cn('size-3.5 transition-transform', !isExpanded && '-rotate-90')}
            />
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* Icon */}
        <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', iconClass)} />

        {/* Label */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={cn('truncate text-xs', isEndpoint && 'font-mono')}>
              {node.label}
            </span>
            {/* Method badge for endpoints */}
            {isEndpoint && node.method && (
              <span
                className={cn(
                  'font-semibold uppercase text-[9px] px-1 rounded',
                  methodColors[node.method] || 'bg-gray-500/10 text-gray-600',
                )}
              >
                {node.method}
              </span>
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
          {/* Add child — only for folders */}
          {isFolder && (
            <>
              <button
                type="button"
                className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                title="New Folder"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChild(node.originalId, 'folder');
                }}
              >
                <Plus className="h-3 w-3" />
              </button>
            </>
          )}

          {/* Rename — folders/collections */}
          {isFolder && (
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Rename"
              onClick={(e) => {
                e.stopPropagation();
                onRename(node);
              }}
            >
              <Edit2 className="h-2.5 w-2.5" />
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
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>

        {/* Grip Handle — drag trigger, visible on hover */}
        <button
          type="button"
          className="flex h-5 w-4 flex-shrink-0 items-center justify-center rounded-sm text-muted-foreground/30 opacity-0 group-hover/tree-row:opacity-100 transition-opacity cursor-grab active:cursor-grabbing hover:text-muted-foreground touch-none"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
