import * as React from 'react';
import {
  FileIcon,
  FolderIcon,
  CheckCircleIcon,
  CloudArrowDownIcon,
  CopyIcon,
  LinkSimpleIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PRESIGNED_URL_EXPIRATIONS } from '../constants';
import type { R2Item } from '../types';

interface ExplorerDetailsPaneProps {
  item: R2Item | null;
  cacheStatus: Record<string, { isCached: boolean; localPath: string }>;
  onOpenFile: (item: R2Item) => void;
  onCopyPublicUrl: (item: R2Item) => void;
  onCopyPresignedUrl: (item: R2Item, seconds: number) => void;
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === 0) return '—';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function ExplorerDetailsPane({
  item,
  cacheStatus,
  onOpenFile,
  onCopyPublicUrl,
  onCopyPresignedUrl,
}: ExplorerDetailsPaneProps) {
  const [expiration, setExpiration] = React.useState('3600');

  if (!item) {
    return (
      <div className="w-full h-full flex-1 bg-background/30 flex flex-col items-center justify-center p-6 text-center text-muted-foreground select-none">
        <FileIcon className="size-8 text-muted-foreground/35 mb-2" />
        <p className="text-xs font-medium">No item selected</p>
        <p className="text-[10px] text-muted-foreground/80 mt-0.5">
          Select a file or folder to view its properties and actions.
        </p>
      </div>
    );
  }

  const cached = cacheStatus[item.key]?.isCached;
  const localPath = cacheStatus[item.key]?.localPath;

  return (
    <div className="w-full h-full flex-1 bg-background flex flex-col select-none overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-border flex flex-col items-center text-center">
        {item.type === 'folder' ? (
          <FolderIcon className="size-12 text-yellow-500 mb-2" />
        ) : (
          <FileIcon className="size-12 text-zinc-400 mb-2" />
        )}
        <h3 className="text-sm font-semibold text-foreground break-all px-2">
          {item.name}
        </h3>
        <span className="text-[10px] text-muted-foreground capitalize mt-0.5">
          {item.type}
        </span>
      </div>

      {/* Properties list */}
      <div className="p-4 border-b border-border space-y-3">
        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Properties
        </h4>
        <div className="space-y-2 text-[11px]">
          <div>
            <span className="text-muted-foreground block">Key</span>
            <span className="font-mono text-foreground break-all">{item.key}</span>
          </div>
          {item.type === 'file' && (
            <>
              <div>
                <span className="text-muted-foreground block">Size</span>
                <span className="font-mono text-foreground">{formatBytes(item.size)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Last Modified</span>
                <span className="text-foreground">
                  {item.lastModified ? new Date(item.lastModified).toLocaleString() : '—'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions / Cache Section */}
      <div className="p-4 flex-1 flex flex-col gap-4">
        {item.type === 'file' && (
          <>
            {/* Cache Card */}
            <div className="border border-border rounded-lg p-3 bg-muted/20">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Cache Sync
              </h4>
              {cached ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-1.5 text-green-500 text-xs">
                    <CheckCircleIcon className="size-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Local Cached Sync</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed break-all font-mono">
                        {localPath}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full text-xs h-8 gap-1.5"
                    onClick={() => onOpenFile(item)}
                  >
                    Open Local File
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-1.5 text-muted-foreground text-xs">
                    <CloudArrowDownIcon className="size-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">Remote Object Only</p>
                      <p className="text-[10px] mt-0.5 leading-relaxed">
                        File is not cached locally. Click stream to download and open.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    className="w-full text-xs h-8 gap-1.5"
                    onClick={() => onOpenFile(item)}
                  >
                    Stream & Open File
                  </Button>
                </div>
              )}
            </div>

            {/* Presigned URL copy card */}
            <div className="border border-border rounded-lg p-3 bg-muted/10 space-y-3">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Temporary URL Access
              </h4>
              <div className="flex items-center gap-2">
                <Select
                  value={expiration}
                  onValueChange={setExpiration}
                >
                  <SelectTrigger className="h-8 text-xs font-sans">
                    <SelectValue placeholder="Expiration" />
                  </SelectTrigger>
                  <SelectContent className="font-sans text-xs">
                    {PRESIGNED_URL_EXPIRATIONS.map((opt) => (
                      <SelectItem key={opt.seconds} value={opt.seconds.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 shrink-0 text-xs"
                  onClick={() => onCopyPresignedUrl(item, parseInt(expiration, 10))}
                >
                  <LinkSimpleIcon className="size-3.5" />
                  Presigned
                </Button>
              </div>
            </div>

            {/* Public URL copy action */}
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-8 gap-1.5"
              onClick={() => onCopyPublicUrl(item)}
            >
              <CopyIcon className="size-3.5" />
              Copy Public URL
            </Button>
          </>
        )}

        {item.type === 'folder' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
            <FolderIcon className="size-8 text-yellow-500/60 mb-1.5" />
            <p className="text-xs font-medium">Selected Folder</p>
            <p className="text-[10px] text-muted-foreground/80 mt-0.5 leading-normal">
              Folder path key: <span className="font-mono text-foreground">{item.key}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
