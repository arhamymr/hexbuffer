'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  RefreshCw,
  Sparkles,
  Bug,
  FileText,
  Webhook,
  Bell,
  Terminal,
  ScanLine,
  Plug,
  Shield,
  Zap,
  Code,
  Hash,
  Download,
  FilePlus,
  FileCode,
  Network,
  Square,
  GripVertical,
  AlertTriangle,
} from 'lucide-react';
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
import type { AutomationNodeData } from '../types';

const iconMap: Record<string, typeof Sparkles> = {
  RefreshCw,
  Sparkles,
  Bug,
  FileText,
  Webhook,
  Bell,
  Terminal,
  ScanLine,
  Plug,
  Shield,
  Zap,
  Code,
  Hash,
  Download,
  FilePlus,
  FileCode,
  Network,
  Square,
};

function ActionNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as AutomationNodeData;
  const Icon = iconMap[nodeData.iconName] || Sparkles;
  const runtime = useNodeRuntimeStatus(id);
  const isExecuting = runtime?.status === 'running';
  const warning = getAutomationNodeWarning(nodeData, runtime);

  return (
    <div
      className={cn(
        'group relative min-w-[180px] rounded-md border-2 shadow-sm transition-shadow',
        CATEGORY_BORDER.action,
        CATEGORY_BG.action,
        selected && 'ring-2 ring-ring ring-offset-2',
        isExecuting && 'animate-pulse ring-2 ring-emerald-400 ring-offset-2 shadow-lg shadow-emerald-500/20',
      )}
    >
      <NodeDeleteButton nodeId={id} selected={selected} />
      <Handle
        type="target"
        position={Position.Top}
        isConnectable
        style={{ width: 12, height: 12, borderWidth: 2, top: -6 }}
        className={cn('transition-colors', CATEGORY_HANDLE.action)}
      />

      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className={cn('flex size-7 items-center justify-center rounded-lg', CATEGORY_ICON_BG.action)}>
          <Icon className={cn('size-3.5', CATEGORY_ICON_TEXT.action)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{nodeData.label}</p>
          <p className="truncate text-[10px] text-muted-foreground">Action</p>
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

      <NodeRuntimeStatus runtime={runtime} accentClassName="border-emerald-500/20" />

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable
        style={{ width: 12, height: 12, borderWidth: 2, bottom: -6 }}
        className={cn('transition-colors', CATEGORY_HANDLE.action)}
      />
    </div>
  );
}

export const ActionNode = React.memo(ActionNodeComponent);
