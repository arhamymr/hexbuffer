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
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface FileGridCardProps<T extends FileItem> {
  item: T;
  isSelected: boolean;
  isRenaming: boolean;
  renameValue?: string;
  onSelectItem: (item: T) => void;
  onDoubleClickItem: (item: T) => void;
  onDeleteItem: (item: T) => void;
  renderExtraContextMenuItems?: (item: T) => React.ReactNode;
  renderGridStatusOverlay?: (item: T) => React.ReactNode;
  onRenameStart?: (e: React.MouseEvent, item: T) => void;
  onRenameChange?: (value: string) => void;
  onRenameCommit?: (item: T) => void;
  onRenameCancel?: () => void;
  renameInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function FileGridCard<T extends FileItem>({
  item,
  isSelected,
  isRenaming,
  renameValue,
  onSelectItem,
  onDoubleClickItem,
  onDeleteItem,
  renderExtraContextMenuItems,
  renderGridStatusOverlay,
  onRenameStart,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  renameInputRef,
}: FileGridCardProps<T>) {
  const cardContent = (
    <ContextMenuTrigger asChild>
      <div
        onClick={() => onSelectItem(item)}
        onDoubleClick={() => onDoubleClickItem(item)}
        onContextMenu={() => onSelectItem(item)}
        className={cn(
          'relative flex flex-col items-center p-2 rounded-md justify-between text-center cursor-pointer transition-all duration-150 ease-out active:scale-[0.97] group',
          isSelected
            ? 'bg-muted/80'
            : ''
        )}
        style={{ height: '100px' }}
      >
        {/* Icon */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          {item.type === 'folder' ? (
            <img
              src={getFolderIconSrc(item.name)}
              alt=""
              className="size-14 shrink-0 select-none object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/src/assets/explorer-icon/_folder.svg';
              }}
            />
          ) : (
            <img
              src={getFileIconSrc(item.name) ?? '/src/assets/explorer-icon/_file.svg'}
              alt=""
              className="size-14 shrink-0 select-none object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/src/assets/explorer-icon/_file.svg';
              }}
            />
          )}
        </div>

        {/* Label / Rename input */}
        <div className="w-full flex flex-col items-center justify-end relative">
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
              className="w-full bg-transparent border border-primary/60 rounded px-1 py-0.5 text-[10px] text-center text-foreground outline-none focus:ring-1 focus:ring-primary/40 min-w-0"
              autoFocus
            />
          ) : (
            <span
              className={cn(
                'text-[11px] font-sans truncate w-full px-1 block',
                item.type === 'folder'
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground group-hover:text-foreground'
              )}
              title={item.name}
            >
              {item.name}
            </span>
          )}

          {!isRenaming && renderGridStatusOverlay && renderGridStatusOverlay(item)}
        </div>
      </div>
    </ContextMenuTrigger>
  );

  return (
    <ContextMenu>
      {isRenaming ? (
        cardContent
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            {cardContent}
          </TooltipTrigger>
          <TooltipContent>
            {item.name}
          </TooltipContent>
        </Tooltip>
      )}

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
