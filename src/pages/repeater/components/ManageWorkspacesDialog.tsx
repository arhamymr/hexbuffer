import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRepeaterStore } from '@/stores/repeater';
import { deleteWorkspace, renameWorkspace } from '@/triggers/repeater';
import {
  TrashIcon,
  PencilSimpleIcon,
  CheckIcon,
  XIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { toast } from 'sonner';

interface ManageWorkspacesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDeleteId?: string | null;
  onClearInitialDeleteId?: () => void;
}

export function ManageWorkspacesDialog({
  open,
  onOpenChange,
  initialDeleteId,
  onClearInitialDeleteId,
}: ManageWorkspacesDialogProps) {
  const workspaces = useRepeaterStore((s) => s.workspaces);
  const activeWorkspaceId = useRepeaterStore((s) => s.activeWorkspaceId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const editInputRef = useRef<HTMLInputElement>(null);

  // If initialDeleteId is provided (e.g. from closing a tab), automatically prompt for deletion
  useEffect(() => {
    if (open && initialDeleteId) {
      setConfirmDeleteId(initialDeleteId);
      setEditingId(null);
    } else if (!open) {
      // Reset state on close
      setEditingId(null);
      setConfirmDeleteId(null);
      onClearInitialDeleteId?.();
    }
  }, [open, initialDeleteId, onClearInitialDeleteId]);

  // Focus rename input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
    setConfirmDeleteId(null);
  };

  const handleSaveRename = (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      toast.error('Workspace name cannot be empty');
      return;
    }
    renameWorkspace(id, trimmed);
    setEditingId(null);
    toast.success('Workspace renamed successfully');
  };

  const handleStartDelete = (id: string) => {
    if (workspaces.length <= 1) {
      toast.error('Cannot delete the last remaining workspace');
      return;
    }
    setConfirmDeleteId(id);
    setEditingId(null);
  };

  const handleConfirmDelete = async (id: string) => {
    const targetWs = workspaces.find((w) => w.id === id);
    if (!targetWs) return;

    try {
      await deleteWorkspace(id);
      toast.success(`Workspace "${targetWs.name}" and its collections deleted`);
      setConfirmDeleteId(null);
      // If we deleted the tab that opened the modal, clear the initial request
      onClearInitialDeleteId?.();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete workspace');
    }
  };

  const targetDeleteWorkspace = workspaces.find((w) => w.id === confirmDeleteId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background border p-6 shadow-lg rounded-lg sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Manage Workspaces</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Rename or delete your Repeater workspaces.
          </DialogDescription>
        </DialogHeader>

        {confirmDeleteId && targetDeleteWorkspace ? (
          // ponytail: keep confirmation card inline to prevent multi-level modal nesting complexity
          <div className="mt-4 space-y-4 rounded-md border border-destructive/20 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <WarningCircleIcon className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-destructive">Delete Workspace</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete <span className="font-semibold text-foreground">"{targetDeleteWorkspace.name}"</span>?
                  This will permanently delete this workspace and all folders, collections, and requests inside it.
                  This action <span className="font-semibold text-destructive">cannot</span> be undone.
                </p>
              </div>
            </div>

            {/* ponytail: remove input check to simplify the delete flow */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                className="h-8 px-3 text-xs"
                onClick={() => {
                  setConfirmDeleteId(null);
                  onClearInitialDeleteId?.();
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="h-8 px-3 text-xs font-medium"
                onClick={() => void handleConfirmDelete(confirmDeleteId)}
              >
                Delete Workspace
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <ScrollArea className="max-h-[300px] pr-2">
              {workspaces.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No workspaces available.
                </div>
              ) : (
                <div className="space-y-1">
                  {workspaces.map((ws) => {
                    const isEditing = editingId === ws.id;
                    const isActive = activeWorkspaceId === ws.id;

                    return (
                      <div
                        key={ws.id}
                        className={`flex items-center justify-between gap-3 p-2 rounded-md border transition-colors ${
                          isActive
                            ? 'bg-primary/5 border-primary/20'
                            : 'border-transparent hover:bg-muted/30'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-1.5">
                            <Input
                              ref={editInputRef}
                              className="h-8 text-xs px-2 py-1"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(ws.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600"
                              onClick={() => handleSaveRename(ws.id)}
                            >
                              <CheckIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-muted"
                              onClick={() => setEditingId(null)}
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-medium truncate">
                                {ws.name}
                              </span>
                              {isActive && (
                                <span className="shrink-0 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold border border-primary/10">
                                  Active
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                                onClick={() => handleStartRename(ws.id, ws.name)}
                                title="Rename workspace"
                              >
                                <PencilSimpleIcon className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                className="h-7 w-7 p-0 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40 disabled:hover:bg-transparent"
                                disabled={workspaces.length <= 1}
                                onClick={() => handleStartDelete(ws.id)}
                                title={
                                  workspaces.length <= 1
                                    ? 'Cannot delete the last remaining workspace'
                                    : 'Delete workspace'
                                }
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end pt-2">
              <Button variant="outline" className="h-8 text-xs px-3" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
