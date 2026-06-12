'use client';

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Play,
  Globe,
  Clock,
  Bug,
  CheckCircle,
  ScanLine,
  Plug,
  Radio,
  Activity,
  Network,
  GripVertical,
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
import { NodeRuntimeStatus, useNodeRuntimeStatus } from './node-runtime-status';
import type { AutomationNodeData, TriggerConfig } from '../types';

const iconMap: Record<string, typeof Play> = {
  Play,
  Globe,
  Clock,
  Bug,
  CheckCircle,
  ScanLine,
  Plug,
  Radio,
  Activity,
  Network,
};

function TriggerNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as AutomationNodeData;
  const Icon = iconMap[nodeData.iconName] || Play;
  const config = nodeData.config as TriggerConfig;
  const isManual = config?.triggerType === 'trigger:manual';
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
            CATEGORY_BORDER.trigger,
            CATEGORY_BG.trigger,
            selected && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
            isExecuting && 'animate-pulse ring-2 ring-blue-400 ring-offset-2 shadow-lg shadow-blue-500/20',
          )}
        >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className={cn('flex size-7 items-center justify-center rounded-lg', CATEGORY_ICON_BG.trigger)}>
          <Icon className={cn('size-3.5', CATEGORY_ICON_TEXT.trigger)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{nodeData.label}</p>
          <p className="truncate text-[10px] text-muted-foreground">Trigger</p>
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
        <GripVertical className="size-3.5 shrink-0 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {isManual && (
        <div className="border-t border-blue-500/20 px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="size-1.5 rounded-full bg-emerald-500" />
            Click to run
          </div>
        </div>
      )}

      {config?.triggerType === 'trigger:live-traffic-captured' && (
        <div className="border-t border-cyan-500/20 bg-cyan-500/[0.03] px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-[10px]">
            <div className="size-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_4px_theme(colors.cyan.400)]" />
            <span className="text-cyan-400 font-medium">Listening</span>
            {[
              config.method && `Method: ${config.method}`,
              config.host && `Host: ${config.host}`,
              config.value && `${config.operator ?? 'contains'} "${config.value}"`,
            ].filter(Boolean).length > 0 && (
              <span className="text-muted-foreground">
                · {[
                  config.method && `Method: ${config.method}`,
                  config.host && `Host: ${config.host}`,
                  config.value && `${config.operator ?? 'contains'} "${config.value}"`,
                ].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>
      )}

      {config?.triggerType === 'trigger:browser-page-crawled' && (
        <div className="border-t border-blue-500/20 bg-blue-500/[0.03] px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-[10px]">
            <div className="size-1.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_4px_theme(colors.blue.400)]" />
            <span className="text-blue-400 font-medium">Listening for pages</span>
            {[
              config.host && `Host: ${config.host}`,
              config.value && `${config.operator ?? 'contains'} "${config.value}"`,
            ].filter(Boolean).length > 0 && (
              <span className="text-muted-foreground">
                · {[
                  config.host && `Host: ${config.host}`,
                  config.value && `${config.operator ?? 'contains'} "${config.value}"`,
                ].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>
      )}

      <NodeRuntimeStatus runtime={runtime} accentClassName="border-blue-500/20" />

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable
        style={{ width: 12, height: 12, borderWidth: 2, bottom: -6 }}
        className={cn('transition-colors', CATEGORY_HANDLE.trigger)}
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

export const TriggerNode = React.memo(TriggerNodeComponent);
