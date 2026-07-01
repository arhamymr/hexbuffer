import React, { useRef, useEffect } from 'react';
import { CaretDownIcon, DotsSixVerticalIcon, FolderStarIcon, PlusIcon, TrashIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { FlatNode, DropAction } from './utils';
import { getMethodColor } from '@/lib/method-colors';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

// ── Props ──

export interface TreeNodeRowProps {
  node: FlatNode;
  isSelected: boolean;
  isExpanded: boolean;
  isDragOver: boolean;
  dropAction: DropAction | null;
  endpointCount: number;
  isRenaming?: boolean;
  renameValue?: string;
  onRenameValueChange?: (value: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
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
  isRenaming = false,
  renameValue = '',
  onRenameValueChange,
  onRenameSubmit,
  onRenameCancel,
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

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  const isCollection = node.kind === 'collection';
  const isEndpoint = node.kind === 'endpoint';

  // Drop indicator classes
  const showBeforeLine = dropAction?.action === 'reorder-before';
  const showAfterLine = dropAction?.action === 'reorder-after';
  const showInsideHighlight = dropAction?.action === 'reparent';

  return (
    <div ref={setNodeRef} id={node.id} style={style} className="relative group/tree-row pl-1">
      {/* Drop indicator: insert-before line */}
      {showBeforeLine && (
        <div className="absolute -top-[1px] left-2 right-2 h-[2px] rounded-full bg-primary z-10" />
      )}

      {/* Drop indicator: insert-after line */}
      {showAfterLine && (
        <div className="absolute -bottom-[1px] left-2 right-2 h-[2px] rounded-full bg-primary z-10" />
      )}

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              'flex cursor-pointer items-center gap-1 rounded-sm py-0.5 transition-colors hover:bg-muted group/tree-row',
              isSelected && 'bg-muted',
              isDragOver && showInsideHighlight && 'bg-primary/30 ring-1 ring-primary/30',
            )}
            onClick={() => {
              if (isRenaming) return;
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

            {/* Folder icon — clickable for collections to toggle expand */}
            {isCollection && (
              <FolderStarIcon
                className="size-4 flex-shrink-0 text-blue-500 cursor-pointer hover:scale-110 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(node.id);
                }}
              />
            )}

            {/* Label */}
            <div
              className={cn('min-w-0 flex-1', isCollection && 'cursor-pointer')}
              onClick={(e) => {
                if (isRenaming) {
                  e.stopPropagation();
                  return;
                }
                if (isCollection) {
                  e.stopPropagation();
                  onToggleExpand(node.id);
                }
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (!isRenaming) {
                  onRename(node);
                }
              }}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                {/* Method badge for endpoints */}
                {isEndpoint && node.method && (
                  <span className={cn('text-[9px] font-bold font-mono uppercase shrink-0', getMethodColor(node.method))}>
                    {node.method}
                  </span>
                )}

                {isRenaming ? (
                  /* ponytail: Simple inline input handling blur/Enter/Escape to minimize state overhead */
                  <input
                    ref={inputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => onRenameValueChange?.(e.target.value)}
                    onBlur={onRenameSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation();
                        onRenameSubmit?.();
                      } else if (e.key === 'Escape') {
                        e.stopPropagation();
                        onRenameCancel?.();
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="h-5 w-full min-w-0 bg-background border border-ring/55 rounded px-1 text-xs focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring font-sans"
                  />
                ) : (
                  <span className={cn('truncate text-xs')}>
                    {node.label}
                  </span>
                )}
                {/* Endpoint count badge for collections */}
                {isCollection && endpointCount > 0 && !isRenaming && (
                  <span className="shrink-0 text-[10px] leading-none text-muted-foreground/60 tabular-nums">
                    {endpointCount}
                  </span>
                )}

              </div>
            </div>

            {/* Drag handle Handle — drag trigger, visible on hover */}
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
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {isCollection && (
            <ContextMenuItem
              onClick={() => onAddChild(node.originalId, 'endpoint')}
              className="text-xs"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              New Endpoint
            </ContextMenuItem>
          )}
          <ContextMenuItem
            onClick={() => onRename(node)}
            className="text-xs"
          >
            <PencilSimpleIcon className="mr-2 h-4 w-4" />
            Rename
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onDelete(node)}
            variant="destructive"
            className="text-xs"
          >
            <TrashIcon className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
