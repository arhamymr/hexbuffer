'use client';

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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CATEGORY_BORDER,
  CATEGORY_BG,
  CATEGORY_ICON_BG,
  CATEGORY_ICON_TEXT,
  CATEGORY_HANDLE,
} from '../constants';
import { NodeDeleteButton } from './node-delete-button';
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

export function TriggerNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as AutomationNodeData;
  const Icon = iconMap[nodeData.iconName] || Play;
  const config = nodeData.config as TriggerConfig;
  const isManual = config?.triggerType === 'trigger:manual';

  return (
    <div
      className={cn(
        'group relative min-w-[180px] rounded-xl border-2 shadow-sm transition-shadow',
        CATEGORY_BORDER.trigger,
        CATEGORY_BG.trigger,
        selected && 'ring-2 ring-ring ring-offset-2',
      )}
    >
      <NodeDeleteButton nodeId={id} selected={selected} />
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className={cn('flex size-7 items-center justify-center rounded-lg', CATEGORY_ICON_BG.trigger)}>
          <Icon className={cn('size-3.5', CATEGORY_ICON_TEXT.trigger)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{nodeData.label}</p>
          <p className="truncate text-[10px] text-muted-foreground">Trigger</p>
        </div>
      </div>

      {isManual && (
        <div className="border-t border-blue-500/20 px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="size-1.5 rounded-full bg-emerald-500" />
            Click to run
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className={cn('!size-3 !border-2 !bg-background transition-colors', CATEGORY_HANDLE.trigger)}
      />
    </div>
  );
}
