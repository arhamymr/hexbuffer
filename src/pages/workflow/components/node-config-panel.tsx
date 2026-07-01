import { XIcon, TrashIcon, Info } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useAutomationStore } from '@/stores/automation';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type Node } from '@xyflow/react';
import type {
  AutomationNodeData,
  TriggerConfig,
  ConditionConfig,
  ActionConfig,
} from '../types';
import { NODE_TYPE_REGISTRY } from '../constants';
import {
  TriggerConfigForm,
  LiveTrafficPanel,
  ConditionConfigForm,
  ActionConfigForm,
} from '../nodes/nodes-config';
import { NodeDataFlow } from './node-data-flow';

interface NodeConfigPanelProps {
  node: Node<AutomationNodeData> | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: AutomationNodeData) => void;
  onDelete?: (nodeId: string) => void;
  onRun?: () => void;
}

export function NodeConfigPanel({ node, onClose, onUpdate, onDelete, onRun }: NodeConfigPanelProps) {
  const runtime = useAutomationStore((s) => (node ? s.nodeRuntimeById[node.id] ?? null : null));

  if (!node) return null;

  const { data } = node;
  const def = NODE_TYPE_REGISTRY[data.nodeType];
  if (!def) return null;

  const category = def.category;
  const triggerConfig = data.config as TriggerConfig;
  const isLiveTrafficTrigger =
    category === 'trigger' && triggerConfig.triggerType === 'trigger:live-traffic-captured';

  const updateConfig = (patch: Partial<TriggerConfig & ConditionConfig & ActionConfig>) => {
    onUpdate(node.id, {
      ...data,
      config: { ...data.config, ...patch },
    } as AutomationNodeData);
  };

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-1 border-b px-3 py-2">
        <span className="text-xs font-semibold">Node Properties</span>
        <div className="ml-auto flex items-center gap-0.5">
          {onDelete && (
            <Button
              variant="ghost"
              size="xs"
              className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={() => onDelete(node.id)}
              aria-label="Delete node"
            >
              <TrashIcon className="size-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="xs"
            className="h-6 w-6 p-0"
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Node info bar */}
      <div className="shrink-0 border-b px-4 py-2">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium">{def.label}</p>
          {def.description && (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6} className="max-w-52">
                <p className="text-[11px]">{def.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {category}
        </p>
      </div>

      {/* Tabbed content */}
      <Tabs defaultValue="config" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-3 h-7 w-auto shrink-0">
          <TabsTrigger value="config" className="text-[11px] h-6">
            Config
          </TabsTrigger>
          {isLiveTrafficTrigger && (
            <TabsTrigger value="traffic" className="text-[11px] h-6">
              Traffic
            </TabsTrigger>
          )}
          <TabsTrigger value="properties" className="text-[11px] h-6">
            Properties
          </TabsTrigger>
          <TabsTrigger value="data-flow" className="text-[11px] h-6">
            Data Flow
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="px-4 py-3 space-y-4">
              {category === 'trigger' && (
                <TriggerConfigForm
                  config={triggerConfig}
                  onChange={updateConfig}
                  onRun={onRun}
                />
              )}
              {category === 'condition' && (
                <ConditionConfigForm
                  config={data.config as ConditionConfig}
                  inputData={runtime?.inputData}
                  onChange={updateConfig}
                />
              )}
              {category === 'action' && (
                <ActionConfigForm config={data.config as ActionConfig} type={data.nodeType} onChange={updateConfig} />
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {isLiveTrafficTrigger && (
          <TabsContent value="traffic" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <div className="px-4 py-3">
                <LiveTrafficPanel nodeId={node.id} />
              </div>
            </ScrollArea>
          </TabsContent>
        )}

        <TabsContent value="properties" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="px-4 py-3 space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Node ID</span>
                <p className="text-xs font-mono text-muted-foreground break-all select-all">{node.id}</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">TextTIcon</span>
                <p className="text-xs font-mono text-muted-foreground break-all">{data.nodeType}</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</span>
                <p className="text-xs capitalize text-muted-foreground">{category}</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Position</span>
                <p className="text-xs font-mono text-muted-foreground">
                  x: {Math.round(node.position.x)}, y: {Math.round(node.position.y)}
                </p>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="data-flow" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="px-4 py-3">
              <NodeDataFlow nodeType={data.nodeType} runtime={runtime} />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
