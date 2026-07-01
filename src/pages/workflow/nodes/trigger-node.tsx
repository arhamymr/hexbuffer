import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  PlayIcon,
  GlobeIcon,
  ClockIcon,
  BugIcon,
  CheckCircleIcon,
  ScanIcon,
  Plug,
  RadioIcon,
  PulseIcon,
  NetworkIcon,
  DotsSixIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useAutomationStore } from '@/stores/automation';
import { Button } from '@/components/ui/button';
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
import type { AutomationNodeData, TriggerConfig } from '../types';

const iconMap: Record<string, typeof PlayIcon> = {
  PlayIcon,
  GlobeIcon,
  ClockIcon,
  BugIcon,
  CheckCircleIcon,
  ScanIcon,
  Plug,
  RadioIcon,
  PulseIcon,
  NetworkIcon,
};

function TriggerNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as AutomationNodeData;
  const Icon = iconMap[nodeData.iconName] || PlayIcon;
  const config = nodeData.config as TriggerConfig;
  const isManual = config?.triggerType === 'trigger:manual';
  const isLiveTraffic = config?.triggerType === 'trigger:live-traffic-captured';
  const isWebSocketMessage = config?.triggerType === 'trigger:websocket-message';
  const triggerNeedsHost = (isLiveTraffic || isWebSocketMessage) && !config.host?.trim();
  const liveTrafficNeedsHost = isLiveTraffic && triggerNeedsHost;
  const websocketNeedsHost = isWebSocketMessage && triggerNeedsHost;
  const runtime = useNodeRuntimeStatus(id);
  const isExecuting = runtime?.status === 'running';
  const warning = getAutomationNodeWarning(nodeData, runtime);
  const capability = getAutomationNodeCapability(nodeData);
  const activeWorkflowId = useAutomationStore((state) => state.activeWorkflowId);
  const runWorkflow = useAutomationStore((state) => state.runWorkflow);
  const isWorkflowListening = useAutomationStore((state) => {
    const workflow = state.workflows.find((item) => item.id === state.activeWorkflowId);
    return workflow?.enabled ?? true;
  });
  const handleManualRun = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!activeWorkflowId || isExecuting) return;
    void runWorkflow(activeWorkflowId, {
      triggerType: 'trigger:manual',
      triggerNodeId: id,
      data: {
        triggeredAt: new Date().toISOString(),
        source: 'manual-node',
      },
    });
  }, [activeWorkflowId, id, isExecuting, runWorkflow]);

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
            triggerNeedsHost && 'border-amber-500 shadow-amber-500/20',
            isExecuting && 'border-red-500 animate-pulse ring-2 ring-red-500 ring-offset-2 shadow-lg shadow-red-500/25',
          )}
        >
          {triggerNeedsHost && (
            <div className="rounded-t-[5px] border-b border-amber-500/40 bg-amber-500/15 px-3 py-2 text-amber-700 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <WarningCircleIcon className="mt-0.5 size-5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase leading-none">Host required</p>
                  <p className="mt-1 text-[10px] leading-tight">
                    Add at least one host before this trigger <br /> can capture traffic.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2.5">
            <DotsSixIcon className="size-3.5 shrink-0 text-muted-foreground/30 opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className={cn('flex size-7 items-center justify-center rounded-md', CATEGORY_ICON_BG.trigger)}>
              <Icon className={cn('size-3.5', CATEGORY_ICON_TEXT.trigger)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs">{nodeData.label}</p>
              <p className="truncate text-[10px] text-muted-foreground">Trigger</p>
            </div>
            {warning && (
              <span title={warning}>
                <WarningCircleIcon
                  className={cn('shrink-0 text-amber-500', triggerNeedsHost ? 'size-5' : 'size-3.5')}
                  aria-label={warning}
                />
              </span>
            )}
            {!capability.supported && capability.reason && (
              <NodeCapabilityBadge reason={capability.reason} />
            )}
            <NodeCardMenu nodeId={id} nodeLabel={nodeData.label} />
          </div>

          {isManual && (
            <div className="border-t border-blue-500/20 px-3 py-1.5">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="size-1.5 rounded-full bg-emerald-500" />
                <span className="flex-1">Manual trigger</span>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="nodrag nopan h-6 px-2 text-[10px]"
                  disabled={isExecuting}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={handleManualRun}
                  title={isExecuting ? 'Workflow is processing' : 'Run workflow'}
                >
                  <PlayIcon className="mr-1 size-3" />
                  Run
                </Button>
              </div>
            </div>
          )}

          {isLiveTraffic && (
            <div
              className={cn(
                'border-t px-3 py-1.5',
                liveTrafficNeedsHost
                  ? 'border-amber-500/30 bg-amber-500/[0.06]'
                  : isWorkflowListening
                    ? 'border-cyan-500/20 bg-cyan-500/[0.03]'
                    : 'border-amber-500/20 bg-amber-500/[0.04]'
              )}
            >
              <div className="flex items-center gap-1.5 text-[10px]">
                <div
                  className={cn(
                    'size-1.5 rounded-full',
                    liveTrafficNeedsHost
                      ? 'bg-amber-500'
                      : isWorkflowListening
                        ? 'animate-pulse bg-cyan-400 shadow-[0_0_4px_theme(colors.cyan.400)]'
                        : 'bg-amber-500'
                  )}
                />
                <span className={cn('font-medium', liveTrafficNeedsHost ? 'text-amber-500' : isWorkflowListening ? 'text-cyan-400' : 'text-amber-500')}>
                  {liveTrafficNeedsHost ? 'Host required' : isWorkflowListening ? 'Listening' : 'Listening paused'}
                </span>
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

          {isWebSocketMessage && (
            <div
              className={cn(
                'border-t px-3 py-1.5',
                websocketNeedsHost
                  ? 'border-amber-500/30 bg-amber-500/[0.06]'
                  : isWorkflowListening
                    ? 'border-violet-500/20 bg-violet-500/[0.03]'
                    : 'border-amber-500/20 bg-amber-500/[0.04]'
              )}
            >
              <div className="flex items-center gap-1.5 text-[10px]">
                <div
                  className={cn(
                    'size-1.5 rounded-full',
                    websocketNeedsHost
                      ? 'bg-amber-500'
                      : isWorkflowListening
                        ? 'animate-pulse bg-violet-400 shadow-[0_0_4px_theme(colors.violet.400)]'
                        : 'bg-amber-500'
                  )}
                />
                <span className={cn('font-medium', websocketNeedsHost ? 'text-amber-500' : isWorkflowListening ? 'text-violet-400' : 'text-amber-500')}>
                  {websocketNeedsHost ? 'Host required' : isWorkflowListening ? 'Listening for messages' : 'Listening paused'}
                </span>
                {[
                  config.direction && `Direction: ${config.direction}`,
                  config.host && `Host: ${config.host}`,
                  config.value && `${config.operator ?? 'contains'} "${config.value}"`,
                ].filter(Boolean).length > 0 && (
                    <span className="text-muted-foreground">
                      · {[
                        config.direction && `Direction: ${config.direction}`,
                        config.host && `Host: ${config.host}`,
                        config.value && `${config.operator ?? 'contains'} "${config.value}"`,
                      ].filter(Boolean).join(' · ')}
                    </span>
                  )}
              </div>
            </div>
          )}

          {config?.triggerType === 'trigger:browser-page-crawled' && (
            <div
              className={cn(
                'border-t px-3 py-1.5',
                isWorkflowListening
                  ? 'border-blue-500/20 bg-blue-500/[0.03]'
                  : 'border-amber-500/20 bg-amber-500/[0.04]'
              )}
            >
              <div className="flex items-center gap-1.5 text-[10px]">
                <div
                  className={cn(
                    'size-1.5 rounded-full',
                    isWorkflowListening
                      ? 'animate-pulse bg-blue-400 shadow-[0_0_4px_theme(colors.blue.400)]'
                      : 'bg-amber-500'
                  )}
                />
                <span className={cn('font-medium', isWorkflowListening ? 'text-blue-400' : 'text-amber-500')}>
                  {isWorkflowListening ? 'Listening for pages' : 'Listening paused'}
                </span>
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
