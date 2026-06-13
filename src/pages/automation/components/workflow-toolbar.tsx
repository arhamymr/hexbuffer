'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAutomationStore } from '@/stores/automation';
import { AlertTriangle, Trash2, Pencil, Check, X, Loader2, OctagonX, Pause, Play, PauseCircle } from 'lucide-react';
import { getWorkflowReadiness } from '../lib/workflow-readiness';

export function WorkflowToolbar() {
  const workflow = useAutomationStore((s) =>
    s.workflows.find((w) => w.id === s.activeWorkflowId) ?? null
  );
  const setWorkflowName = useAutomationStore((s) => s.setWorkflowName);
  const deleteWorkflow = useAutomationStore((s) => s.deleteWorkflow);
  const abortWorkflow = useAutomationStore((s) => s.abortWorkflow);
  const toggleWorkflowEnabled = useAutomationStore((s) => s.toggleWorkflowEnabled);
  const activeWorkflowRuntime = useAutomationStore((s) =>
    s.activeWorkflowId ? s.workflowRuntimeById[s.activeWorkflowId] ?? null : null
  );
  const readiness = React.useMemo(() => getWorkflowReadiness(workflow), [workflow]);
  const isThisWorkflowRunning = Boolean(workflow?.id && activeWorkflowRuntime?.processing);
  const hasLiveTrafficTrigger = React.useMemo(
    () => Boolean(workflow?.nodes.some((node) =>
      node.type === 'trigger:live-traffic-captured' ||
      node.type === 'trigger:browser-page-crawled'
    )),
    [workflow]
  );

  const [editing, setEditing] = React.useState(false);
  const [editName, setEditName] = React.useState('');

  const startEdit = React.useCallback(() => {
    if (!workflow) return;
    setEditName(workflow.name);
    setEditing(true);
  }, [workflow]);

  const confirmEdit = React.useCallback(() => {
    if (!workflow || !editName.trim()) return;
    setWorkflowName(workflow.id, editName.trim());
    setEditing(false);
  }, [workflow, editName, setWorkflowName]);

  const cancelEdit = React.useCallback(() => {
    setEditing(false);
  }, []);

  const handleDelete = React.useCallback(() => {
    if (!workflow) return;
    deleteWorkflow(workflow.id);
  }, [workflow, deleteWorkflow]);

  const handleAbort = React.useCallback(() => {
    if (!workflow) return;
    abortWorkflow(workflow.id, 'stopped by user');
  }, [workflow, abortWorkflow]);

  const handleToggleListening = React.useCallback(() => {
    if (!workflow) return;
    toggleWorkflowEnabled(workflow.id);
  }, [workflow, toggleWorkflowEnabled]);

  if (!workflow) {
    return (
      <div className="flex h-10 items-center border-b bg-muted px-3">
        <p className="text-xs text-muted-foreground">Select or create a workflow to begin</p>
      </div>
    );
  }

  return (
    <div className="flex h-10 items-center gap-2 border-b bg-muted px-3">
      {editing ? (
        <div className="flex items-center gap-1.5">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-6 w-48 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
          />
          <Button variant="ghost" size="xs" onClick={confirmEdit}>
            <Check className="size-3.5" />
          </Button>
          <Button variant="ghost" size="xs" onClick={cancelEdit}>
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-medium max-w-[200px]">
            {workflow.name}
          </span>
          <Button variant="ghost" size="xs" className="h-6 w-6 p-0" onClick={startEdit}>
            <Pencil className="size-3" />
          </Button>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {hasLiveTrafficTrigger && !workflow.enabled ? (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <PauseCircle className="size-3 text-amber-500" />
            <span className="font-medium text-amber-500">Listening Paused</span>
          </div>
        ) : isThisWorkflowRunning ? (
          <div className="flex items-center gap-1.5 text-[10px]">
            <Loader2 className="size-3 animate-spin text-emerald-400" />
            <span className="text-emerald-400 font-medium">Running</span>
          </div>
        ) : !readiness.ready ? (
          <div className="flex min-w-0 items-center gap-1.5 text-[10px]" title={readiness.reason ?? undefined}>
            <AlertTriangle className="size-3 shrink-0 text-amber-500" />
            <span className="max-w-56 truncate font-medium text-amber-500">
              {readiness.reason ?? 'Needs action'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="size-1.5 rounded-full bg-emerald-500/70" />
            <span>Ready</span>
          </div>
        )}
        {isThisWorkflowRunning && (
          <Button
            variant="outline"
            size="xs"
            className="h-7 border-amber-500/30 text-amber-600 hover:text-amber-700 dark:text-amber-300"
            onClick={handleAbort}
            title="Abort this workflow run"
          >
            <OctagonX className="mr-1 size-3.5" />
            Abort
          </Button>
        )}
        {hasLiveTrafficTrigger && (
          <Button
            variant="outline"
            size="xs"
            className="h-7"
            onClick={handleToggleListening}
            title={workflow.enabled ? 'Pause live-traffic listening' : 'Start live-traffic listening'}
          >
            {workflow.enabled ? (
              <Pause className="mr-1 size-3.5" />
            ) : (
              <Play className="mr-1 size-3.5" />
            )}
            {workflow.enabled ? 'Pause Listening' : 'Start Listening'}
          </Button>
        )}
        <Button
          variant="ghost"
          size="xs"
          className="h-7 text-destructive hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
