import * as React from 'react';
import { DatabaseIcon, PlusIcon, TrashIcon, WarningIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ExplorerSidebarProps {
  buckets: string[];
  currentBucket: string;
  onSelectBucket: (bucket: string) => void;
  onAddCustomBucket: (name: string) => void;
  onRemoveBucket: (name: string) => void;
  loading: boolean;
}

export function ExplorerSidebar({
  buckets,
  currentBucket,
  onSelectBucket,
  onAddCustomBucket,
  onRemoveBucket,
  loading,
}: ExplorerSidebarProps) {
  const [newBucketName, setNewBucketName] = React.useState('');
  const [confirmRemove, setConfirmRemove] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;
    onAddCustomBucket(newBucketName.trim());
    setNewBucketName('');
  };

  const handleRemoveClick = (e: React.MouseEvent, bucket: string) => {
    e.stopPropagation();
    setConfirmRemove(bucket);
  };

  const handleConfirmRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmRemove) {
      onRemoveBucket(confirmRemove);
      setConfirmRemove(null);
    }
  };

  const handleCancelRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmRemove(null);
  };

  return (
    <div className="w-56 border-r border-border bg-background/50 flex flex-col shrink-0 justify-between">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            R2 Buckets
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading && buckets.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground animate-pulse">
              Discovering buckets…
            </div>
          ) : buckets.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground italic">
              No buckets discovered.
            </div>
          ) : (
            buckets.map((bucket) => {
              const active = bucket === currentBucket;
              const isConfirming = confirmRemove === bucket;

              if (isConfirming) {
                return (
                  <div
                    key={bucket}
                    className="rounded-md border border-destructive/40 bg-destructive/10 p-2 space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-destructive font-medium">
                      <WarningIcon className="size-3.5 shrink-0" />
                      <span className="truncate">Remove <strong>{bucket}</strong>?</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="xs"
                        variant="destructive"
                        className="h-5 text-[10px] flex-1 px-2"
                        onClick={handleConfirmRemove}
                      >
                        Remove
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        className="h-5 text-[10px] flex-1 px-2"
                        onClick={handleCancelRemove}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={bucket} className="group flex items-center gap-1">
                  <button
                    onClick={() => onSelectBucket(bucket)}
                    className={cn(
                      'flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md text-left text-xs font-medium transition-colors min-w-0',
                      active
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <DatabaseIcon className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="truncate">{bucket}</span>
                  </button>
                  <button
                    onClick={(e) => handleRemoveClick(e, bucket)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:text-destructive text-muted-foreground shrink-0"
                    title={`Remove ${bucket}`}
                  >
                    <TrashIcon className="size-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Manual bucket registration input */}
      <div className="p-3 border-t border-border bg-background/40">
        <form onSubmit={handleSubmit} className="flex gap-1">
          <Input
            size="xs"
            value={newBucketName}
            onChange={(e) => setNewBucketName(e.target.value)}
            placeholder="Add bucket manually…"
            className="text-[10px] h-7 w-full font-sans"
          />
          <Button type="submit" size="xs" variant="outline" className="size-7 p-0 shrink-0">
            <PlusIcon className="size-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
