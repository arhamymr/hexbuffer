import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ApiCall } from '@/types';
import { useGroupsStore } from '@/stores/history';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCall?: ApiCall;
}

export function CreateGroupDialog({ open, onOpenChange, initialCall }: CreateGroupDialogProps) {
  const [name, setName] = useState('');
  const groups = useGroupsStore((s) => s.groups);
  const createGroup = useGroupsStore((s) => s.createGroup);
  const addRequestToGroup = useGroupsStore((s) => s.addRequestToGroup);

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Check if a group with this name already exists (case-insensitive)
    const existing = groups.find((g) => g.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (initialCall) addRequestToGroup(existing.id, initialCall);
    } else {
      const groupId = createGroup(trimmed);
      if (groupId && initialCall) {
        addRequestToGroup(groupId, initialCall);
      }
    }
    onOpenChange(false);
  }, [name, groups, createGroup, addRequestToGroup, initialCall, onOpenChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSubmit();
    },
    [handleSubmit]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>New Group</DialogTitle>
          <DialogDescription>
            Create a group to organize related requests.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={50}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
