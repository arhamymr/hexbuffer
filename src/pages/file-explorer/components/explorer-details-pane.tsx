import * as React from 'react';
import {
  FileIcon,
  FolderIcon,
  CheckCircleIcon,
  CloudArrowDownIcon,
  LinkSimpleIcon,
  KeyIcon,
  ArrowSquareOutIcon,
  DownloadSimpleIcon,
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
import type { R2Item } from '../hooks/use-file-explorer';

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
      <div className="w-80 border-l border-border bg-background/30 flex flex-col items-center justify-center p-6 text-center text-muted-foreground select-none shrink-0">
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
    <div className="w-80 border-l border-border bg-background flex flex-col select-none shrink-0 overflow-y-auto">
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
                      <p className="font-medium">Stored Locally</p>
                      <p className="text-[10px] text-muted-foreground break-all mt-0.5 font-mono">
                        {localPath}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="xs"
                    className="w-full text-xs"
                    onClick={() => onOpenFile(item)}
                  >
                    <ArrowSquareOutIcon className="mr-1.5 size-3.5" />
                    Open Local File
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-1.5 text-zinc-500 text-xs">
                    <CloudArrowDownIcon className="size-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Available on R2 Cloud</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Double-click or download to stream and write to local cache.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="xs"
                    className="w-full text-xs"
                    onClick={() => onOpenFile(item)}
                  >
                    <DownloadSimpleIcon className="mr-1.5 size-3.5" />
                    Download & Open
                  </Button>
                </div>
              )}
            </div>

            {/* Sharing / Link generation */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Object Links
              </h4>
              <div className="flex flex-col gap-2">
                {/* Copy public link */}
                <Button
                  size="xs"
                  variant="outline"
                  className="w-full justify-start text-xs font-normal"
                  onClick={() => onCopyPublicUrl(item)}
                >
                  <LinkSimpleIcon className="mr-2 size-3.5 text-primary shrink-0" />
                  Copy Public Object URL
                </Button>

                {/* Generate presigned URL */}
                <div className="border border-border rounded-lg p-2.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <KeyIcon className="size-3.5 text-primary" />
                      Presigned URL
                    </span>
                    <Select
                      value={expiration}
                      onValueChange={setExpiration}
                    >
                      <SelectTrigger className="w-24 h-6 text-[10px] p-1.5">
                        <SelectValue placeholder="Expires in" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRESIGNED_URL_EXPIRATIONS.map((opt) => (
                          <SelectItem key={opt.seconds} value={String(opt.seconds)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => onCopyPresignedUrl(item, Number(expiration))}
                  >
                    Generate & Copy Link
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {item.type === 'folder' && (
          <div className="border border-border rounded-lg p-3 bg-muted/20 text-center">
            <FolderIcon className="size-8 text-yellow-500/60 mx-auto mb-1.5" />
            <p className="text-xs font-semibold">Virtual Prefix Directory</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
              Folders are virtual nodes representing key prefixes. Double-click to browse files inside this directory path.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
