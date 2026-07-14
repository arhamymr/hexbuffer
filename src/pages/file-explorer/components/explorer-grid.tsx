import {
  FolderIcon,
  FileIcon,
  FilePdfIcon,
  FileImageIcon,
  FileCodeIcon,
  FileTextIcon,
  CheckCircleIcon,
  CloudArrowDownIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { R2Item } from '../hooks/use-file-explorer';

interface ExplorerGridProps {
  items: R2Item[];
  selectedItem: R2Item | null;
  onSelectItem: (item: R2Item) => void;
  onDoubleClickItem: (item: R2Item) => void;
  onDeleteItem: (item: R2Item) => void;
  cacheStatus: Record<string, { isCached: boolean; localPath: string }>;
  loading: boolean;
}

// Helpers for size formatting
function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === 0) return '—';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return <FilePdfIcon className="size-4 text-rose-500 shrink-0" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
    case 'ico':
      return <FileImageIcon className="size-4 text-blue-500 shrink-0" />;
    case 'json':
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'html':
    case 'css':
    case 'sh':
      return <FileCodeIcon className="size-4 text-amber-500 shrink-0" />;
    case 'txt':
    case 'md':
    case 'yaml':
    case 'yml':
    case 'csv':
      return <FileTextIcon className="size-4 text-zinc-400 shrink-0" />;
    default:
      return <FileIcon className="size-4 text-zinc-400 shrink-0" />;
  }
}

export function ExplorerGrid({
  items,
  selectedItem,
  onSelectItem,
  onDoubleClickItem,
  onDeleteItem,
  cacheStatus,
  loading,
}: ExplorerGridProps) {
  if (loading && items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-xs text-muted-foreground">
        Loading files and folders…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background">
        <FolderIcon className="size-8 text-muted-foreground/50 mb-2" />
        <p className="text-xs font-semibold text-foreground">Empty directory</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          This folder contains no files or sub-directories.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-background">
      <table className="w-full text-left border-collapse text-xs select-none">
        <thead>
          <tr className="border-b border-border bg-muted/30 sticky top-0 z-10">
            <th className="px-4 py-2 font-medium text-muted-foreground w-1/2">Name</th>
            <th className="px-4 py-2 font-medium text-muted-foreground w-16 text-center">Type</th>
            <th className="px-4 py-2 font-medium text-muted-foreground w-24 text-right">Size</th>
            <th className="px-4 py-2 font-medium text-muted-foreground w-36">Last Modified</th>
            <th className="px-4 py-2 font-medium text-muted-foreground w-20 text-center">Sync</th>
            <th className="px-4 py-2 font-medium text-muted-foreground w-12 text-center"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 font-mono">
          {items.map((item) => {
            const isSelected = selectedItem?.key === item.key;
            const cached = cacheStatus[item.key]?.isCached;

            return (
              <tr
                key={item.key}
                onClick={() => onSelectItem(item)}
                onDoubleClick={() => onDoubleClickItem(item)}
                className={cn(
                  'hover:bg-muted/40 cursor-pointer transition-colors group',
                  isSelected ? 'bg-muted/80 text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {/* Name */}
                <td className="px-4 py-1.5 flex items-center gap-2 truncate font-sans text-xs">
                  {item.type === 'folder' ? (
                    <FolderIcon className="size-4 text-yellow-500 shrink-0" />
                  ) : (
                    getFileIcon(item.name)
                  )}
                  <span className={cn('truncate', item.type === 'folder' ? 'font-medium' : 'text-muted-foreground group-hover:text-foreground')}>{item.name}</span>
                </td>

                {/* Type */}
                <td className="px-4 py-1.5 text-center text-[10px] capitalize font-sans">
                  {item.type}
                </td>

                {/* Size */}
                <td className="px-4 py-1.5 text-right font-mono text-[11px]">
                  {item.type === 'folder' ? '—' : formatBytes(item.size)}
                </td>

                {/* Last Modified */}
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

                {/* Cache Status */}
                <td className="px-4 py-1.5 text-center">
                  {item.type === 'folder' ? (
                    '—'
                  ) : cached ? (
                    <span className="inline-flex items-center text-[10px] text-green-500 font-sans gap-1">
                      <CheckCircleIcon className="size-3.5" />
                      Local
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[10px] text-zinc-500 font-sans gap-1">
                      <CloudArrowDownIcon className="size-3.5" />
                      R2
                    </span>
                  )}
                </td>

                {/* Action buttons (Delete hover) */}
                <td className="px-2 py-1.5 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete '${item.name}'?`)) {
                        onDeleteItem(item);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-500 rounded p-0.5 text-muted-foreground shrink-0 transition-opacity"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
