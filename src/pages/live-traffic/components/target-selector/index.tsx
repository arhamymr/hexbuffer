import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PlusIcon, TargetIcon, ArrowLeftIcon } from '@phosphor-icons/react';
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
          <Button variant="outline" size="xs" className="gap-1.5 active:scale-[0.97] transition-all">
            <TargetIcon className="h-3.5 w-3.5 text-primary" />
            Manage Target
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[480px] p-5 gap-4">
        {showCreateNew ? (
          <>
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={handleCancelCreate}
                  className="h-6 w-6 rounded-full shrink-0 -ml-1 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                  aria-label="Back to target list"
                >
                  <ArrowLeftIcon className="h-3.5 w-3.5" />
                </Button>
                <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                  {editingTarget ? 'Edit Target' : 'Create New Target'}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground pl-7">
                {editingTarget
                  ? 'Update target parameters and active domain scope rules.'
                  : 'Define a target name and domain scope patterns to start monitoring.'}
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
            <DialogHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="p-1 rounded-md bg-primary/10 text-primary">
                    <TargetIcon className="h-4 w-4" />
                  </div>
                  Target Scope Selector
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] font-normal border-border/60">
                  {targetCount} {targetCount === 1 ? 'Target' : 'Targets'}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Select an existing target to activate monitoring scope, or define a new target.
              </DialogDescription>
            </DialogHeader>

            <TargetSearchList
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              targetCount={targetCount}
              filteredTargets={filteredTargets}
              onSelectTarget={handleSelectTarget}
              onEditTarget={handleEditTarget}
            />

            <DialogFooter className="pt-2 border-t border-border/40 flex items-center justify-between sm:justify-between">
              <span className="text-[11px] text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filteredCount}</span> of {targetCount}
              </span>
              <Button
                variant="default"
                size="xs"
                onClick={handleCreateNew}
                className="gap-1.5 active:scale-[0.98] transition-all"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Create New Target
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

