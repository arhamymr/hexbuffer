'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Plus, Workflow, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAutomationStore } from '@/stores/automation';
import { DEFAULT_WORKFLOW_NAME } from '../constants';

export function WorkflowListPanel() {
  const workflows = useAutomationStore((s) => s.workflows);
  const activeWorkflowId = useAutomationStore((s) => s.activeWorkflowId);
  const createWorkflow = useAutomationStore((s) => s.createWorkflow);
  const setActiveWorkflowId = useAutomationStore((s) => s.setActiveWorkflowId);
  const toggleWorkflowEnabled = useAutomationStore((s) => s.toggleWorkflowEnabled);

  return (
    <div className="flex h-full flex-col border-r bg-background">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-semibold text-muted-foreground">Workflows</span>
        <Button variant="ghost" size="xs" className="h-6 w-6 p-0" onClick={() => createWorkflow()}>
          <Plus className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-6 text-muted-foreground">
            <Workflow className="size-8 opacity-30" />
            <p className="text-[11px] text-center">No workflows yet</p>
            <Button variant="outline" size="xs" onClick={() => createWorkflow()}>
              Create your first workflow
            </Button>
          </div>
        ) : (
          <div className="space-y-0.5 p-1">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer transition-colors',
                  activeWorkflowId === wf.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted/50',
                )}
                onClick={() => setActiveWorkflowId(wf.id)}
              >
                <Workflow className="size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium">
                    {wf.name || DEFAULT_WORKFLOW_NAME}
                  </p>
                  <p className="truncate text-[9px] text-muted-foreground">
                    {wf.nodes.length} nodes · {wf.edges.length} edges
                  </p>
                </div>
                <button
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleWorkflowEnabled(wf.id);
                  }}
                >
                  {wf.enabled ? (
                    <ToggleRight className="size-4 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="size-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
