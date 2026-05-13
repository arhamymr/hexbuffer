'use client';

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
import { Plus, Search } from 'lucide-react';
import { TargetDialog } from './target-dialog';
import type { Target } from '@/types';

interface TargetSelectorDialogProps {
  onTargetSelected: (target: Target) => void;
  existingTargets: Target[];
  onTargetsUpdated: () => void;
}

export function TargetSelectorDialog({
  onTargetSelected,
  existingTargets,
  onTargetsUpdated,
}: TargetSelectorDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [showCreateNew, setShowCreateNew] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredTargets = existingTargets.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTargetCreated = (target: Target) => {
    onTargetsUpdated();
    onTargetSelected(target);
    setOpen(false);
    setShowCreateNew(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        setShowCreateNew(false);
        setSearchQuery('');
      }
    }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2 h-6 w-6">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {showCreateNew ? (
          <>
            <DialogHeader>
              <DialogTitle>Create New Target</DialogTitle>
              <DialogDescription>
                Add a new target with scope patterns to monitor
              </DialogDescription>
            </DialogHeader>
            <TargetDialogForm onTargetCreated={handleTargetCreated} onCancel={() => setShowCreateNew(false)} />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add New Tab</DialogTitle>
              <DialogDescription>
                Select an existing target or create a new one
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search targets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-[200px] overflow-y-auto space-y-1">
                {filteredTargets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchQuery ? 'No targets found' : 'No targets yet'}
                  </p>
                ) : (
                  filteredTargets.map((target) => (
                    <button
                      key={target.id}
                      onClick={() => {
                        console.log('[TargetSelector] Selected:', target);
                        onTargetSelected(target);
                        setOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <span className="font-medium">{target.name}</span>
                      {target.scope.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({target.scope.length} scope patterns)
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateNew(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create New Target
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TargetDialogForm({ onTargetCreated, onCancel }: { onTargetCreated: (target: Target) => void; onCancel: () => void }) {
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
      const newTarget = await invoke<Target>('create_target', { name: name.trim(), scope: scopes });
      onTargetCreated(newTarget);
    } catch (e) {
      console.error('Failed to create target:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={!name.trim() || loading}>
          Create Target
        </Button>
      </DialogFooter>
    </>
  );
}