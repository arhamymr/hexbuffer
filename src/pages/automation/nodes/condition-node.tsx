'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { AlertTriangle, SquareFunction, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CATEGORY_BORDER,
  CATEGORY_BG,
  CATEGORY_ICON_BG,
  CATEGORY_ICON_TEXT,
  CATEGORY_HANDLE,
} from '../constants';
import { getAutomationNodeWarning } from '../lib/node-warnings';
import { NodeDeleteButton } from './node-delete-button';
import { NodeRuntimeStatus, useNodeRuntimeStatus } from './node-runtime-status';
import type { AutomationNodeData, ConditionConfig } from '../types';

const operatorGlyphs: Record<string, string> = {
  equals: '=',
  not_equals: '\u2260',
  contains: '\u2283',
  gt: '>',
  lt: '<',
  regex: '\u2248',
};

function ConditionNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as AutomationNodeData;
  const config = nodeData.config as ConditionConfig;
  const glyph = operatorGlyphs[config?.operator] ?? '?';
  const runtime = useNodeRuntimeStatus(id);
  const isExecuting = runtime?.status === 'running';
  const warning = getAutomationNodeWarning(nodeData, runtime);

  return (
    <div
      className={cn(
        'group relative min-w-[180px] rounded-md border-2 shadow-sm transition-shadow',
        CATEGORY_BORDER.condition,
        CATEGORY_BG.condition,
        selected && 'ring-2 ring-ring ring-offset-2',
        isExecuting && 'animate-pulse ring-2 ring-amber-400 ring-offset-2 shadow-lg shadow-amber-500/20',
      )}
    >
      <NodeDeleteButton nodeId={id} selected={selected} />
      <Handle
        type="target"
        position={Position.Top}
        isConnectable
        style={{ width: 12, height: 12, borderWidth: 2, top: -6 }}
        className={cn('transition-colors', CATEGORY_HANDLE.condition)}
      />

      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className={cn('flex size-7 items-center justify-center rounded-lg', CATEGORY_ICON_BG.condition)}>
          <SquareFunction className={cn('size-3.5', CATEGORY_ICON_TEXT.condition)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{nodeData.label}</p>
          <p className="truncate text-[10px] text-muted-foreground">Condition</p>
        </div>
        {warning && (
          <AlertTriangle
            className="size-3.5 shrink-0 text-amber-500"
            aria-label={warning}
            title={warning}
          />
        )}
        <GripVertical className="size-3.5 shrink-0 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
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

      <NodeRuntimeStatus runtime={runtime} accentClassName="border-amber-500/20" />

      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        isConnectable
        style={{ width: 12, height: 12, borderWidth: 2, left: '35%', bottom: -6 }}
        className="!bg-emerald-500 !border-background hover:!bg-emerald-600 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        isConnectable
        style={{ width: 12, height: 12, borderWidth: 2, left: '65%', bottom: -6 }}
        className="!bg-red-500 !border-background hover:!bg-red-600 transition-colors"
      />
    </div>
  );
}

export const ConditionNode = React.memo(ConditionNodeComponent);
