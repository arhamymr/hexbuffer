import * as React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

interface TargetDialogProps {
  onTargetCreated: () => void;
}

export function TargetDialog({ onTargetCreated }: TargetDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [scopeInput, setScopeInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const scopes = scopeInput
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      await invoke('create_target', { name: name.trim(), scope: scopes });
      setName('');
      setDescription('');
      setScopeInput('');
      setOpen(false);
      onTargetCreated();
    } catch (e) {
      console.error('Failed to create target:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="xs">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Target</DialogTitle>
          <DialogDescription>
            Add a new target with scope patterns to monitor
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Example API"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="scope" className="text-sm font-medium">
              Scope Patterns
            </label>
            <textarea
              id="scope"
              value={scopeInput}
              onChange={(e) => setScopeInput(e.target.value)}
              placeholder="*.example.com&#10;api.example.com"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Enter one pattern per line. Use *.domain.com for wildcard matching.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button size="xs" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="xs" onClick={handleCreate} disabled={!name.trim() || loading}>
            Create Target
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}