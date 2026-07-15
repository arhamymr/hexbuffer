import * as React from 'react';
import { FolderOpenIcon, TrashIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { getFileIconSrc, getFolderIconSrc } from '../lib/file-icons';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { FileItem } from './file-grid';

interface FileListRowProps<T extends FileItem> {
  item: T;
  isSelected: boolean;
  isRenaming: boolean;
  renameValue?: string;
  onSelectItem: (item: T) => void;
  onDoubleClickItem: (item: T) => void;
  onDeleteItem: (item: T) => void;
  renderSyncStatus?: (item: T) => React.ReactNode;
  renderExtraContextMenuItems?: (item: T) => React.ReactNode;
  onRenameStart?: (e: React.MouseEvent, item: T) => void;
  onRenameChange?: (value: string) => void;
  onRenameCommit?: (item: T) => void;
  onRenameCancel?: () => void;
  renameInputRef?: React.RefObject<HTMLInputElement | null>;
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === 0) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FileListRow<T extends FileItem>({
  item,
  isSelected,
  isRenaming,
  renameValue,
  onSelectItem,
  onDoubleClickItem,
  onDeleteItem,
  renderSyncStatus,
  renderExtraContextMenuItems,
  onRenameStart,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  renameInputRef,
}: FileListRowProps<T>) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <tr
          onClick={() => onSelectItem(item)}
          onDoubleClick={() => onDoubleClickItem(item)}
          onContextMenu={() => onSelectItem(item)}
          className={cn(
            'hover:bg-muted/40 cursor-pointer transition-colors group',
            isSelected ? 'bg-muted/80 text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {/* Name */}
          <td className="px-4 py-1.5 flex items-center gap-2 truncate font-sans text-xs">
            {item.type === 'folder' ? (
              <img
                src={getFolderIconSrc(item.name)}
                alt=""
                className="size-4 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/src/assets/explorer-icon/_folder.svg';
                }}
              />
            ) : (
              <img
                src={getFileIconSrc(item.name) ?? '/src/assets/explorer-icon/_file.svg'}
                alt=""
                className="size-4 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/src/assets/explorer-icon/_file.svg';
                }}
              />
            )}
            {isRenaming && onRenameChange && onRenameCommit && onRenameCancel ? (
              <input
                ref={(el) => {
                  if (renameInputRef) {
                    (renameInputRef as any).current = el;
                  }
                }}
                value={renameValue}
                onChange={(e) => onRenameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onRenameCommit(item);
                  if (e.key === 'Escape') onRenameCancel();
                }}
                onClick={(e) => e.stopPropagation()}
                onBlur={() => onRenameCommit(item)}
                className="flex-1 bg-transparent border border-primary/60 rounded px-1 py-0.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/40 min-w-0"
                autoFocus
              />
            ) : (
              <span
                className={cn(
                  'truncate',
                  item.type === 'folder' ? 'font-medium' : 'text-muted-foreground group-hover:text-foreground'
                )}
              >
                {item.name}
              </span>
            )}
          </td>

          {/* Type */}
          <td className="px-4 py-1.5 text-center text-[10px] capitalize font-sans">
            {item.type}
          </td>

          {/* Size */}
          <td className="px-4 py-1.5 text-right font-mono text-[11px]">
            {item.type === 'folder' ? '—' : formatBytes(item.size)}
          </td>

          {/* Modified */}
          <td className="px-4 py-1.5 text-muted-foreground text-[10px] font-sans">
            {item.lastModified
              ? new Date(item.lastModified).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
              : '—'}
          </td>

          {/* Sync Status */}
          {renderSyncStatus && (
            <td className="px-4 py-1.5 text-center">
              {renderSyncStatus(item)}
            </td>
          )}

          {/* Action buttons */}
          <td className="px-2 py-1.5 text-center">
            <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onRenameStart && (
                <button
                  onClick={(e) => onRenameStart(e, item)}
                  className="hover:text-primary rounded p-0.5 text-muted-foreground"
                  title="Rename"
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteItem(item);
                }}
                className="hover:text-red-500 rounded p-0.5 text-muted-foreground shrink-0"
              >
                <TrashIcon className="size-3.5" />
              </button>
            </div>
          </td>
        </tr>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-44 font-sans">
        <ContextMenuItem onClick={() => onDoubleClickItem(item)}>
          <FolderOpenIcon className="mr-2 size-3.5" />
          <span>{item.type === 'folder' ? 'Open Folder' : 'Open'}</span>
        </ContextMenuItem>

        {onRenameStart && (
          <ContextMenuItem onClick={(e) => onRenameStart(e as any, item)}>
            <svg className="mr-2 size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            <span>Rename</span>
          </ContextMenuItem>
        )}

        {renderExtraContextMenuItems && renderExtraContextMenuItems(item)}

        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onClick={() => {
            onDeleteItem(item);
          }}
        >
          <TrashIcon className="mr-2 size-3.5" />
          <span>Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
