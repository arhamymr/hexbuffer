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
import { PlusIcon, TargetIcon } from '@phosphor-icons/react';
import { TargetSearchList } from './target-search-list';
import { TargetDialogForm } from './target-dialog-form';
import { useTargetSelectorDialog } from './hooks';

export function TargetSelectorDialog({
  externalOpen,
  onExternalOpenChange,
}: {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
} = {}) {
  const isExternallyControlled = externalOpen !== undefined && onExternalOpenChange !== undefined;

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
  } = useTargetSelectorDialog({ externalOpen, onExternalOpenChange });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isExternallyControlled && (
        <DialogTrigger asChild>
          <Button>
            <TargetIcon className="size-3" />
            Manage TargetIcon
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        {showCreateNew ? (
          <>
            <DialogHeader>
              <DialogTitle>{editingTarget ? 'Edit TargetIcon' : 'Create New TargetIcon'}</DialogTitle>
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
              <Button variant="outline" onClick={handleCreateNew} className="gap-2">
                <PlusIcon className="h-4 w-4" />
                Create New TargetIcon
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
