'use client';

import { Button } from '@/components/ui/button';
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
import { TargetSearchList } from './target-search-list';
import { TargetDialogForm } from './target-dialog-form';
import { useTargetSelectorDialog } from './hooks';

export function TargetSelectorDialog() {
  const {
    open,
    handleOpenChange,
    showCreateNew,
    editingTarget,
    handleCreateNew,
    handleEditTarget,
    handleCancelCreate,
    handleSaveTarget,
    filteredCount,
    searchQuery,
    setSearchQuery,
    filteredTargets,
    targetCount,
    handleSelectTarget,
  } = useTargetSelectorDialog();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="xs" className="gap-2 h-7  mb-1 gap-1 text-xs">
          <Plus className="h-4 w-4" />
          MANAGE TARGET
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {showCreateNew ? (
          <>
            <DialogHeader>
              <DialogTitle>{editingTarget ? 'Edit Target' : 'Create New Target'}</DialogTitle>
              <DialogDescription>
                {editingTarget
                  ? 'Update this target and its scope patterns'
                  : 'Add a new target with scope patterns to monitor'}
              </DialogDescription>
            </DialogHeader>
            <TargetDialogForm
              key={editingTarget?.id ?? 'new-target'}
              target={editingTarget}
              onCancel={handleCancelCreate}
              onSaved={handleSaveTarget}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add New Target</DialogTitle>
              <DialogDescription>
                Select an existing target or create a new one
              </DialogDescription>
            </DialogHeader>
            <div>
              <TargetSearchList
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                targetCount={targetCount}
                filteredTargets={filteredTargets}
                onSelectTarget={handleSelectTarget}
                onEditTarget={handleEditTarget}
              />
            </div>
            <DialogFooter>
              <span className="text-sm text-muted-foreground mr-auto">
                {filteredCount} target{filteredCount !== 1 ? 's' : ''}
              </span>
              <Button size="xs" variant="outline" onClick={handleCreateNew} className="gap-2">
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
