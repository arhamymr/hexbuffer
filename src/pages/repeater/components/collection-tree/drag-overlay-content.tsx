import React from 'react';
import { cn } from '@/lib/utils';
import type { FlatNode } from './utils';

interface DragOverlayContentProps {
  node: FlatNode | null;
}

export function DragOverlayContent({ node }: DragOverlayContentProps) {
  if (!node) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-sm bg-popover border px-2 py-1 shadow-md text-xs">
      <span className="truncate">{node.label}</span>
      {node.kind === 'endpoint' && node.method && (
        <span
          className={cn(
            'font-semibold uppercase text-[9px] px-1 rounded',
            node.method === 'GET' && 'bg-emerald-500/10 text-emerald-600',
            node.method === 'POST' && 'bg-blue-500/10 text-blue-600',
            node.method === 'PUT' && 'bg-amber-500/10 text-amber-600',
            node.method === 'DELETE' && 'bg-red-500/10 text-red-600',
            node.method === 'PATCH' && 'bg-purple-500/10 text-purple-600',
          )}
        >
          {node.method}
        </span>
      )}
    </div>
  );
}
