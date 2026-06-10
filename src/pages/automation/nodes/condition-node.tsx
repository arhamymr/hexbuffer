'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { SquareFunction } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CATEGORY_BORDER,
  CATEGORY_BG,
  CATEGORY_ICON_BG,
  CATEGORY_ICON_TEXT,
  CATEGORY_HANDLE,
} from '../constants';
import { NodeDeleteButton } from './node-delete-button';
import type { AutomationNodeData, ConditionConfig } from '../types';

const operatorGlyphs: Record<string, string> = {
  equals: '=',
  not_equals: '\u2260',
  contains: '\u2283',
  gt: '>',
  lt: '<',
  regex: '\u2248',
};

export function ConditionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as AutomationNodeData;
  const config = nodeData.config as ConditionConfig;
  const glyph = operatorGlyphs[config?.operator] ?? '?';

  return (
    <div
      className={cn(
        'group relative min-w-[180px] rounded-xl border-2 shadow-sm transition-shadow',
        CATEGORY_BORDER.condition,
        CATEGORY_BG.condition,
        selected && 'ring-2 ring-ring ring-offset-2',
      )}
    >
      <NodeDeleteButton nodeId={id} selected={selected} />
      <Handle
        type="target"
        position={Position.Top}
        className={cn('!size-3 !border-2 !bg-background transition-colors', CATEGORY_HANDLE.condition)}
      />

      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className={cn('flex size-7 items-center justify-center rounded-lg', CATEGORY_ICON_BG.condition)}>
          <SquareFunction className={cn('size-3.5', CATEGORY_ICON_TEXT.condition)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{nodeData.label}</p>
          <p className="truncate text-[10px] text-muted-foreground">Condition</p>
        </div>
      </div>

      {config && (
        <div className="border-t border-amber-500/20 px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            <code className="rounded bg-amber-500/10 px-1 py-0.5 text-[10px] font-mono">
              {glyph}
            </code>
            <span className="truncate text-[10px] text-muted-foreground">
              {config.value || '(not set)'}
            </span>
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!size-3 !border-2 !bg-background !border-emerald-500 hover:!bg-emerald-500 transition-colors"
        style={{ left: '35%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!size-3 !border-2 !bg-background !border-red-500 hover:!bg-red-500 transition-colors"
        style={{ left: '65%' }}
      />
    </div>
  );
}
