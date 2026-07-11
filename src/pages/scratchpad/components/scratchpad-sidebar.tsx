import * as React from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilSimpleIcon,
  FileTextIcon,
  CheckIcon,
  XIcon,
  MagnifyingGlassIcon,
  SidebarSimpleIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScratchpadPageHookType } from '../hooks/use-scratchpad-page';

interface ScratchpadSidebarProps {
  hook: ScratchpadPageHookType;
}

export function ScratchpadSidebar({ hook }: ScratchpadSidebarProps) {
  const {
    scratchpads,
    filteredScratchpads,
    activeId,
    searchQuery,
    setSearchQuery,
    editingId,
    renameValue,
    setRenameValue,
    handleStartRename,
    handleRenameSubmit,
    handleRenameCancel,
    handleAdd,
    handleDelete,
    deleteConfirmId,
    deleteConfirmName,
    handleConfirmDelete,
    handleCancelDelete,
    handleSelect,
    toggleSidebar,
  } = hook;

  // ponytail: keeping visual elements light, standard transitions for hover triggers
  return (
    <div className="w-60 shrink-0 border-r bg-muted/10 flex flex-col h-full overflow-hidden select-none animate-in slide-in-from-left duration-200">
      {/* Sidebar Header */}
      <div className="p-3 border-b flex items-center justify-between shrink-0 bg-muted/5">

        <Button
          variant="ghost"
          onClick={handleAdd}
          disabled={scratchpads.length >= 20}
          title={scratchpads.length >= 20 ? "Limit reached (max 20)" : "Create new scratchpad"}
        >
          <PlusIcon className="size-3.5" />
          NEW
        </Button>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="xs"
            onClick={toggleSidebar}
            title="Collapse sidebar"
            className="size-6 p-0 hover:bg-muted active:scale-95 transition-all text-muted-foreground hover:text-foreground shrink-0"
          >
            <SidebarSimpleIcon className="size-3.5" />
          </Button>
        </div>

      </div>

      {/* Search Input */}
      <div className="p-2 border-b shrink-0">
        <div className="relative">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 text-[11px] bg-muted/40 border border-transparent rounded-md pl-7 pr-2 focus:bg-background focus:border-input focus-visible:outline-none transition-colors"
          />
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Note List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
        {filteredScratchpads.length === 0 ? (
          <div className="text-center py-8 text-[11px] text-muted-foreground font-mono">
            No scratchpads found
          </div>
        ) : (
          filteredScratchpads.map((pad) => {
            const isActive = pad.id === activeId;
            const isEditing = pad.id === editingId;

            return (
              <div
                key={pad.id}
                onClick={() => !isEditing && handleSelect(pad.id)}
                className={cn(
                  'group flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-md cursor-pointer transition-all duration-150',
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium shadow-sm'
                    : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground',
                  isEditing && 'cursor-default'
                )}
              >
                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRenameSubmit();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 flex items-center gap-1"
                  >
                    <Input
                      autoFocus
                      className="h-6 flex-1 text-[11px] px-1.5 py-0 bg-background border-primary/40 focus-visible:ring-primary/20"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') handleRenameCancel();
                      }}
                    />
                    <Button
                      type="submit"
                      variant="outline"
                      size="xs"
                      className="size-6 p-0 text-primary active:scale-95"
                    >
                      <CheckIcon className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={handleRenameCancel}
                      className="size-6 p-0 text-muted-foreground active:scale-95"
                    >
                      <XIcon className="size-3" />
                    </Button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileTextIcon
                        className={cn(
                          'size-3.5 shrink-0 transition-colors duration-150',
                          isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                        )}
                        weight={isActive ? 'fill' : 'regular'}
                      />
                      <span className="truncate">{pad.name}</span>
                    </div>

                    <div
                      className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleStartRename(pad.id, pad.name)}
                        className="size-5 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                        title="Rename"
                      >
                        <PencilSimpleIcon className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={scratchpads.length <= 1}
                        onClick={() => handleDelete(pad.id, pad.name)}
                        className="size-5 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:pointer-events-none"
                        title="Delete"
                      >
                        <TrashIcon className="size-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t bg-muted/5 text-[10px] text-muted-foreground flex justify-between items-center select-none font-mono shrink-0">
        <span>Total: {scratchpads.length}/20</span>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => {
          if (!open) handleCancelDelete();
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scratchpad?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteConfirmName}" will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
