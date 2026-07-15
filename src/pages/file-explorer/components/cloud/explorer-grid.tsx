import * as React from 'react';
import {
  CheckCircleIcon,
  CloudArrowDownIcon,
  CopyIcon,
  LinkSimpleIcon,
} from '@phosphor-icons/react';
import type { R2Item } from '../../types';
import { FileGrid, type FileItem } from '../file-grid';
import { ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';

interface ExplorerGridProps {
  items: R2Item[];
  selectedItem: R2Item | null;
  onSelectItem: (item: R2Item) => void;
  onDoubleClickItem: (item: R2Item) => void;
  onDeleteItem: (item: R2Item) => void;
  cacheStatus: Record<string, { isCached: boolean; localPath: string }>;
  loading: boolean;
  viewMode: 'list' | 'grid';
  onCopyPublicUrl?: (item: R2Item) => void;
  onCopyPresignedUrl?: (item: R2Item, seconds: number) => void;
  deletingId?: string | null;
}

export function ExplorerGrid({
  items,
  selectedItem,
  onSelectItem,
  onDoubleClickItem,
  onDeleteItem,
  cacheStatus,
  loading,
  viewMode,
  onCopyPublicUrl,
  onCopyPresignedUrl,
  deletingId,
}: ExplorerGridProps) {
  // Map R2Item to FileItem shape
  const gridItems = React.useMemo(() =>
    items.map((item) => ({
      ...item,
      id: item.key, // Use key as id
    })),
    [items]
  );

  const selectedGridItem = React.useMemo(() =>
    selectedItem ? { ...selectedItem, id: selectedItem.key } : null,
    [selectedItem]
  );

  const getOriginalItem = (gridItem: FileItem): R2Item => {
    return items.find((i) => i.key === gridItem.id)!;
  };

  return (
    <FileGrid
      items={gridItems}
      selectedItem={selectedGridItem}
      loading={loading}
      deletingId={deletingId}
      onSelectItem={(item) => onSelectItem(getOriginalItem(item))}
      onDoubleClickItem={(item) => onDoubleClickItem(getOriginalItem(item))}
      onDeleteItem={(item) => onDeleteItem(getOriginalItem(item))}
      viewMode={viewMode}
      emptyMessage="This folder contains no files or sub-directories."
      renderGridStatusOverlay={(item) => {
        const cached = cacheStatus[item.id]?.isCached;
        if (item.type === 'folder') return null;
        return (
          <span className="absolute right-0 bottom-1">
            <span
              className={`block size-1.5 rounded-full ${cached ? 'bg-green-500' : 'bg-zinc-500'}`}
              title={cached ? 'Local Cached' : 'R2 Remote'}
            />
          </span>
        );
      }}
      renderSyncStatus={(item) => {
        const cached = cacheStatus[item.id]?.isCached;
        if (item.type === 'folder') return '—';
        return cached ? (
          <span className="inline-flex items-center text-[10px] text-green-500 font-sans gap-1">
            <CheckCircleIcon className="size-3.5" /> Local
          </span>
        ) : (
          <span className="inline-flex items-center text-[10px] text-zinc-500 font-sans gap-1">
            <CloudArrowDownIcon className="size-3.5" /> R2
          </span>
        );
      }}
      renderExtraContextMenuItems={(item) => {
        const orig = getOriginalItem(item);
        if (item.type !== 'file' || (!onCopyPublicUrl && !onCopyPresignedUrl)) return null;
        return (
          <>
            <ContextMenuSeparator />
            {onCopyPublicUrl && (
              <ContextMenuItem onClick={() => onCopyPublicUrl(orig)}>
                <CopyIcon className="mr-2 size-3.5" />
                <span>Copy Public URL</span>
              </ContextMenuItem>
            )}
            {onCopyPresignedUrl && (
              <ContextMenuItem onClick={() => onCopyPresignedUrl(orig, 3600)}>
                <LinkSimpleIcon className="mr-2 size-3.5" />
                <span>Copy Presigned URL</span>
              </ContextMenuItem>
            )}
          </>
        );
      }}
    />
  );
}
