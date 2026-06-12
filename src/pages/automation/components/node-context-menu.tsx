'use client';

import React from 'react';
import { Trash2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodeContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  nodeLabel: string;
}

interface NodeContextMenuProps {
  state: NodeContextMenuState | null;
  onClose: () => void;
  onDelete: (nodeId: string) => void;
  onProperties: (nodeId: string) => void;
}

export function NodeContextMenu({ state, onClose, onDelete, onProperties }: NodeContextMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!state) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleKey);
      document.addEventListener('contextmenu', onClose);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('contextmenu', onClose);
    };
  }, [state, onClose]);

  if (!state) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-44 overflow-hidden rounded-lg border bg-popover shadow-lg"
      style={{ left: state.x, top: state.y }}
    >
      {/* Header */}
      <div className="border-b px-3 py-1.5">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {state.nodeLabel}
        </p>
      </div>

      {/* Menu items */}
      <div className="py-1">
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs',
            'hover:bg-accent transition-colors'
          )}
          onClick={() => {
            onProperties(state.nodeId);
            onClose();
          }}
        >
          <Settings className="size-3.5 text-muted-foreground" />
          <span>Properties</span>
        </button>

        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs',
            'text-red-500 hover:bg-red-500/10 transition-colors'
          )}
          onClick={() => {
            onDelete(state.nodeId);
            onClose();
          }}
        >
          <Trash2 className="size-3.5" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}
