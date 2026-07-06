import * as React from 'react';
import { Link } from 'react-router-dom';
import { XIcon, DotsSixIcon } from '@phosphor-icons/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { NavItem } from '../../constants';

export interface DockItemProps {
  item: NavItem;
  active: boolean;
  isOpened: boolean;
  onClose?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

export function DockItem({
  item,
  active,
  isOpened,
  onClose,
  onClick,
  children,
}: DockItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative size-7 group/dock-item touch-none">
          <Link
            to={item.href}
            onClick={onClick}
            className={cn(
              "flex size-full items-center justify-center rounded-sm transition-all active:scale-95 duration-150 text-white border shadow-sm",
              item.colors ? `${item.colors.bg} ${item.colors.border}` : "bg-muted/40 border-transparent text-muted-foreground",
              active
                ? "opacity-100 ring-2 ring-primary/40 ring-offset-1 ring-offset-background"
                : "opacity-85 hover:opacity-100 hover:scale-105"
            )}
          >
            {children}
            <item.icon className="size-3.5 transition-transform duration-150 group-hover/dock-item:scale-110" />

            {/* OS-style open indicator dot */}
            {isOpened && (
              <span
                className={cn(
                  "absolute bottom-[-10px] left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary transition-all duration-200",
                  active ? "bg-primary w-3 h-1 shadow-[0_0_4px_rgba(59,130,246,0.6)]" : "bg-muted-foreground/60 scale-75"
                )}
              />
            )}
          </Link>

          {/* Close button that appears on hover */}
          {onClose && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 scale-90 pointer-events-none group-hover/dock-item:opacity-100 group-hover/dock-item:scale-100 group-hover/dock-item:pointer-events-auto transition-all duration-150 cubic-bezier(0.23, 1, 0.32, 1) shadow-sm border border-background hover:scale-110 active:scale-95 cursor-pointer z-10"
              aria-label={`Close ${item.label}`}
            >
              <XIcon className="size-2.5" />
            </button>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={12} className="flex items-center gap-1.5 font-sans">
        <span>{item.label}</span>
        {item.flag && item.flag !== 'release' && (
          <span className={cn(
            "text-[9px] font-extrabold uppercase tracking-wider px-1 rounded-sm leading-none py-0.5",
            item.flag === 'alpha'
              ? "bg-rose-500/20 text-rose-500 dark:text-rose-400"
              : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
          )}>
            {item.flag}
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function SortableDockItem({
  item,
  active,
  dragActive,
  isOpened,
  onClose,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  dragActive: React.RefObject<boolean>;
  isOpened: boolean;
  onClose?: () => void;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.href });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DockItem
        item={item}
        active={active}
        isOpened={isOpened}
        onClose={onClose}
        onClick={(e) => {
          if (dragActive.current) {
            e.preventDefault();
            return;
          }
          if (onClick) onClick(e);
        }}
      >
        {/* Drag grip indicator — visible on hover */}
        <DotsSixIcon className="absolute -top-1.5 left-1/2 -translate-x-1/2 size-2.5 text-muted-foreground/30 opacity-0 transition-opacity group-hover/dock-item:opacity-100" />
      </DockItem>
    </div>
  );
}
