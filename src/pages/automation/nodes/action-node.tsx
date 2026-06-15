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
  Grip,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  CATEGORY_BORDER,
  CATEGORY_BG,
  CATEGORY_ICON_BG,
  CATEGORY_ICON_TEXT,
  CATEGORY_HANDLE,
  NODE_TYPE_REGISTRY,
} from '../constants';
import { getAutomationNodeCapability } from '../lib/node-capabilities';
import { getAutomationNodeWarning } from '../lib/node-warnings';
import { NodeCapabilityBadge } from './node-capability-badge';
import { NodeCardMenu } from './node-card-menu';
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
  const capability = getAutomationNodeCapability(nodeData);

  const nodeTypeDef = NODE_TYPE_REGISTRY[nodeData.nodeType];
  const description = nodeTypeDef?.description;

  return (
    <Tooltip delayDuration={600}>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'group relative min-w-[180px] rounded-md border-2 shadow-sm transition-shadow',
            CATEGORY_BORDER.action,
            CATEGORY_BG.action,
            selected && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
            isExecuting && 'border-red-500 animate-pulse ring-2 ring-red-500 ring-offset-2 shadow-lg shadow-red-500/25',
          )}
        >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable
        style={{ width: 12, height: 12, borderWidth: 2, top: -6 }}
        className={cn('transition-colors', CATEGORY_HANDLE.action)}
      />

      <div className="flex items-center gap-2 px-3 py-2.5">
        <Grip className="size-3.5 shrink-0 text-muted-foreground/30 opacity-80 group-hover:opacity-100 transition-opacity" />
     
        <div className={cn('flex size-7 items-center justify-center rounded-md', CATEGORY_ICON_BG.action)}>
          <Icon className={cn('size-3.5', CATEGORY_ICON_TEXT.action)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs">{nodeData.label}</p>
          <p className="truncate text-[10px] text-muted-foreground">Action</p>
        </div>
        {warning && (
          <AlertTriangle
            className="size-3.5 shrink-0 text-amber-500"
            aria-label={warning}
          />
        )}
        {!capability.supported && capability.reason && (
          <NodeCapabilityBadge reason={capability.reason} />
        )}
        <NodeCardMenu nodeId={id} nodeLabel={nodeData.label} />
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
      </TooltipTrigger>
      {description && (
        <TooltipContent side="right" sideOffset={12} className="max-w-52">
          <p className="font-medium">{nodeData.label}</p>
          <p className="text-[11px] opacity-80">{description}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}

export const ActionNode = React.memo(ActionNodeComponent);
