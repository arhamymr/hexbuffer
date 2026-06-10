'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { TriggerConfigForm, ConditionConfigForm, ActionConfigForm } from '../nodes/nodes-config';

interface NodeConfigPanelProps {
  node: Node<AutomationNodeData> | null;
  onClose: () => void;
  onUpdate: (nodeId: string, data: AutomationNodeData) => void;
}

export function NodeConfigPanel({ node, onClose, onUpdate }: NodeConfigPanelProps) {
  if (!node) return null;

  const { data } = node;
  const def = NODE_TYPE_REGISTRY[data.nodeType];
  if (!def) return null;

  const category = def.category;

  const updateConfig = (patch: Partial<TriggerConfig & ConditionConfig & ActionConfig>) => {
    onUpdate(node.id, {
      ...data,
      config: { ...data.config, ...patch },
    } as AutomationNodeData);
  };

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
        <span className="text-xs font-semibold">Node Properties</span>
        <Button
          variant="ghost"
          size="xs"
          className="ml-auto h-6 w-6 p-0"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Node info bar */}
      <div className="shrink-0 border-b px-4 py-2">
        <p className="text-sm font-medium">{def.label}</p>
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
          <TabsTrigger value="properties" className="text-[11px] h-6">
            Properties
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="px-4 py-3 space-y-4">
              {category === 'trigger' && (
                <TriggerConfigForm config={data.config as TriggerConfig} onChange={updateConfig} />
              )}
              {category === 'condition' && (
                <ConditionConfigForm config={data.config as ConditionConfig} onChange={updateConfig} />
              )}
              {category === 'action' && (
                <ActionConfigForm config={data.config as ActionConfig} type={data.nodeType} onChange={updateConfig} />
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="properties" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
          <ScrollArea className="h-full">
            <div className="px-4 py-3 space-y-3">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Node ID</span>
                <p className="text-xs font-mono text-muted-foreground break-all select-all">{node.id}</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Type</span>
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
      </Tabs>
    </div>
  );
}
