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
    setOpen,
    showCreateNew,
    handleCreateNew,
    handleCancelCreate,
    filteredCount,
  } = useTargetSelectorDialog();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2 h-7 w-7 mb-1 gap-1 text-muted-foreground">
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
            <TargetDialogForm onCancel={handleCancelCreate} />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add New Tab</DialogTitle>
              <DialogDescription>
                Select an existing target or create a new one
              </DialogDescription>
            </DialogHeader>
            <div>
              <TargetSearchList />
            </div>
            <DialogFooter>
              <span className="text-sm text-muted-foreground mr-auto">
                {filteredCount} target{filteredCount !== 1 ? 's' : ''}
              </span>
              <Button variant="outline" onClick={handleCreateNew} className="gap-2">
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