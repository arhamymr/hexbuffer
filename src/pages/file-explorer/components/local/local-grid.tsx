import * as React from 'react';
import type { LocalItem } from '../../hooks/use-local-storage';
import { FileGrid, type FileItem } from '../file-grid';

interface LocalGridProps {
  items: LocalItem[];
  selectedItem: LocalItem | null;
  loading: boolean;
  onSelectItem: (item: LocalItem) => void;
  onDoubleClickItem: (item: LocalItem) => void;
  onDeleteItem: (item: LocalItem) => void;
  onRenameItem: (item: LocalItem, newName: string) => void;
  viewMode: 'list' | 'grid';
}

export function LocalGrid({
  items,
  selectedItem,
  loading,
  onSelectItem,
  onDoubleClickItem,
  onDeleteItem,
  onRenameItem,
  viewMode,
}: LocalGridProps) {
  const [renamingPath, setRenamingPath] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const renameInputRef = React.useRef<HTMLInputElement>(null);

  // Map LocalItem to FileItem shape
  const gridItems = React.useMemo(() =>
    items.map((item) => ({
      ...item,
      id: item.path, // Use path as id
    })),
    [items]
  );

  const selectedGridItem = React.useMemo(() =>
    selectedItem ? { ...selectedItem, id: selectedItem.path } : null,
    [selectedItem]
  );

  const getOriginalItem = (gridItem: FileItem): LocalItem => {
    return items.find((i) => i.path === gridItem.id)!;
  };

  const startRename = (e: React.MouseEvent, item: FileItem) => {
    e.stopPropagation();
    setRenamingPath(item.id);
    setRenameValue(item.name);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const commitRename = (item: FileItem) => {
    const orig = getOriginalItem(item);
    if (renameValue.trim() && renameValue !== orig.name) {
      onRenameItem(orig, renameValue);
    }
    setRenamingPath(null);
  };

  const cancelRename = () => setRenamingPath(null);

  return (
    <FileGrid
      items={gridItems}
      selectedItem={selectedGridItem}
      loading={loading}
      onSelectItem={(item) => onSelectItem(getOriginalItem(item))}
      onDoubleClickItem={(item) => onDoubleClickItem(getOriginalItem(item))}
      onDeleteItem={(item) => onDeleteItem(getOriginalItem(item))}
      viewMode={viewMode}
      emptyMessage="Import files or create a sub-folder to get started."
      renamingId={renamingPath}
      renameValue={renameValue}
      onRenameStart={startRename}
      onRenameChange={setRenameValue}
      onRenameCommit={commitRename}
      onRenameCancel={cancelRename}
      renameInputRef={renameInputRef}
    />
  );
}
