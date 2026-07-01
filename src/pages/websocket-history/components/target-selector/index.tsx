import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { PlusIcon, TargetIcon } from '@phosphor-icons/react';
import { TargetSearchList } from './target-search-list';
import { TargetDialogForm } from './target-dialog-form';
import { useTargetSelectorDialog } from './hooks';
import { motion, AnimatePresence } from 'motion/react';

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
          <Button className="gap-1.5 active:scale-[0.97]">
            <TargetIcon className="size-3.5" />
            <span>Manage Targets</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[450px] p-5 overflow-hidden border border-border/80 shadow-2xl rounded-xl bg-background animate-in fade-in-50 zoom-in-95 duration-200">
        <AnimatePresence mode="wait">
          {showCreateNew ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold tracking-tight">
                  {editingTarget ? 'Edit Target' : 'Create New Target'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground/80 leading-relaxed mt-1">
                  {editingTarget
                    ? 'Update target parameters and subdomain patterns'
                    : 'Add a new target to define intercept and capture scopes.'}
                </DialogDescription>
              </DialogHeader>
              <TargetDialogForm
                key={editingTarget?.id ?? 'new-target'}
                target={editingTarget}
                onCancel={handleCancelCreate}
                onSaved={handleSaveTarget}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle className="text-sm font-semibold tracking-tight">Select Target</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground/80 leading-relaxed mt-1">
                  Select a target to monitor WebSocket traffic or build a new one.
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
              <DialogFooter className="pt-3 border-t border-border mt-3 flex items-center justify-between sm:justify-between select-none">
                <span className="text-xs text-muted-foreground/75 font-medium">
                  {filteredCount} target{filteredCount !== 1 ? 's' : ''}
                </span>
                <Button variant="outline" onClick={handleCreateNew} className="h-8 text-xs font-semibold gap-1.5 active:scale-[0.97]">
                  <PlusIcon className="h-3.5 w-3.5" />
                  <span>Create New Target</span>
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
