'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAutomationStore } from '@/stores/automation';
import { Save, Play, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react';

export function WorkflowToolbar() {
  const activeWorkflowId = useAutomationStore((s) => s.activeWorkflowId);
  const workflow = useAutomationStore((s) =>
    s.workflows.find((w) => w.id === s.activeWorkflowId) ?? null
  );
  const isRunning = useAutomationStore((s) => s.isRunning);
  const setWorkflowName = useAutomationStore((s) => s.setWorkflowName);
  const deleteWorkflow = useAutomationStore((s) => s.deleteWorkflow);
  const runWorkflow = useAutomationStore((s) => s.runWorkflow);

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

  const handleRun = React.useCallback(() => {
    if (!workflow) return;
    runWorkflow(workflow.id);
  }, [workflow, runWorkflow]);

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

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="outline" size="xs" className="h-7" onClick={handleRun} disabled={isRunning}>
          {isRunning ? (
            <Loader2 className="size-3.5 mr-1 animate-spin" />
          ) : (
            <Play className="size-3.5 mr-1" />
          )}
          {isRunning ? 'Running...' : 'Run'}
        </Button>

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
