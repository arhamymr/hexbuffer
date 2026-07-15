import * as React from 'react';
import { FileGridCard } from './file-grid-card';
import { FileListRow } from './file-list-row';
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

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  lastModified?: string | Date;
}

interface FileGridProps<T extends FileItem> {
  items: T[];
  selectedItem: T | null;
  loading: boolean;
  onSelectItem: (item: T) => void;
  onDoubleClickItem: (item: T) => void;
  onDeleteItem: (item: T) => void;
  viewMode: 'list' | 'grid';
  emptyMessage?: string;
  // Extra elements
  renderSyncStatus?: (item: T) => React.ReactNode;
  renderExtraContextMenuItems?: (item: T) => React.ReactNode;
  renderGridStatusOverlay?: (item: T) => React.ReactNode;
  // Rename Support
  renamingId?: string | null;
  renameValue?: string;
  onRenameStart?: (e: React.MouseEvent, item: T) => void;
  onRenameChange?: (value: string) => void;
  onRenameCommit?: (item: T) => void;
  onRenameCancel?: () => void;
  renameInputRef?: React.RefObject<HTMLInputElement | null>;
  deletingId?: string | null;
}

export function FileGrid<T extends FileItem>({
  items,
  selectedItem,
  loading,
  onSelectItem,
  onDoubleClickItem,
  onDeleteItem,
  viewMode,
  emptyMessage = 'This folder contains no files or sub-directories.',
  renderSyncStatus,
  renderExtraContextMenuItems,
  renderGridStatusOverlay,
  renamingId,
  renameValue,
  onRenameStart,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  renameInputRef,
  deletingId,
}: FileGridProps<T>) {
  const [itemToDelete, setItemToDelete] = React.useState<T | null>(null);

  if (loading && items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-xs text-muted-foreground">
        Loading files…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background select-none">
        <img
          src="/src/assets/explorer-icon/_folder.svg"
          alt=""
          className="size-8 opacity-50 mb-2"
        />
        <p className="text-xs font-semibold text-foreground">Empty folder</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {viewMode === 'grid' ? (
        <div className="flex-1 overflow-auto p-2 bg-background select-none">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-3">
            {items.map((item) => (
              <FileGridCard
                key={item.id}
                item={item}
                isSelected={selectedItem?.id === item.id}
                isRenaming={renamingId === item.id}
                renameValue={renameValue}
                onSelectItem={onSelectItem}
                onDoubleClickItem={onDoubleClickItem}
                onDeleteItem={(item) => setItemToDelete(item)}
                renderExtraContextMenuItems={renderExtraContextMenuItems}
                renderGridStatusOverlay={renderGridStatusOverlay}
                onRenameStart={onRenameStart}
                onRenameChange={onRenameChange}
                onRenameCommit={onRenameCommit}
                onRenameCancel={onRenameCancel}
                renameInputRef={renameInputRef}
                isDeleting={deletingId === item.id}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-background">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="border-b border-border bg-muted/30 sticky top-0 z-10">
                <th className="px-4 py-2 font-medium text-muted-foreground w-1/2">Name</th>
                <th className="px-4 py-2 font-medium text-muted-foreground w-16 text-center">Type</th>
                <th className="px-4 py-2 font-medium text-muted-foreground w-24 text-right">Size</th>
                <th className="px-4 py-2 font-medium text-muted-foreground w-36">Modified</th>
                {renderSyncStatus && (
                  <th className="px-4 py-2 font-medium text-muted-foreground w-20 text-center">Sync</th>
                )}
                <th className="px-4 py-2 font-medium text-muted-foreground w-12 text-center" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              {items.map((item) => (
                <FileListRow
                  key={item.id}
                  item={item}
                  isSelected={selectedItem?.id === item.id}
                  isRenaming={renamingId === item.id}
                  renameValue={renameValue}
                  onSelectItem={onSelectItem}
                  onDoubleClickItem={onDoubleClickItem}
                  onDeleteItem={(item) => setItemToDelete(item)}
                  renderSyncStatus={renderSyncStatus}
                  renderExtraContextMenuItems={renderExtraContextMenuItems}
                  onRenameStart={onRenameStart}
                  onRenameChange={onRenameChange}
                  onRenameCommit={onRenameCommit}
                  onRenameCancel={onRenameCancel}
                  renameInputRef={renameInputRef}
                  isDeleting={deletingId === item.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {itemToDelete?.type === 'folder' ? 'Folder' : 'File'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the {itemToDelete?.type === 'folder' ? 'folder' : 'file'} "{itemToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (itemToDelete) {
                  onDeleteItem(itemToDelete);
                  setItemToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
