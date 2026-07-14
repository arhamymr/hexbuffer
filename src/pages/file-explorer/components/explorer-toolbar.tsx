import * as React from 'react';
import {
  UploadSimpleIcon,
  FolderPlusIcon,
  ArrowClockwiseIcon,
  CaretRightIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ExplorerToolbarProps {
  currentBucket: string;
  currentPrefix: string;
  onNavigateUp: () => void;
  onNavigateToPrefix: (prefix: string) => void;
  onUploadFile: () => void;
  onCreateFolder: (name: string) => Promise<void>;
  onRefresh: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  loading: boolean;
}

export function ExplorerToolbar({
  currentBucket,
  currentPrefix,
  onNavigateUp,
  onNavigateToPrefix,
  onUploadFile,
  onCreateFolder,
  onRefresh,
  searchQuery,
  onSearchChange,
  loading,
}: ExplorerToolbarProps) {
  const [showFolderInput, setShowFolderInput] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await onCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setShowFolderInput(false);
  };

  // Build breadcrumbs
  const breadcrumbs = React.useMemo(() => {
    const parts = currentPrefix.split('/').filter(Boolean);
    const crumbs = [{ label: currentBucket, prefix: '' }];
    
    let pathAcc = '';
    parts.forEach((part) => {
      pathAcc += `${part}/`;
      crumbs.push({
        label: part,
        prefix: pathAcc,
      });
    });
    
    return crumbs;
  }, [currentBucket, currentPrefix]);

  return (
    <div className="flex flex-col gap-2 p-3 border-b border-border bg-background/50 shrink-0">
      <div className="flex items-center justify-between gap-4">
        {/* Breadcrumb path */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <Button
            size="xs"
            variant="ghost"
            onClick={onNavigateUp}
            disabled={!currentPrefix || loading}
            className="size-7 p-0"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>

          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground whitespace-nowrap">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && <CaretRightIcon className="size-3 text-border shrink-0" />}
                  <button
                    onClick={() => !isLast && onNavigateToPrefix(crumb.prefix)}
                    disabled={isLast || loading}
                    className={crumb.label ? (isLast ? 'text-foreground font-semibold' : 'hover:text-foreground hover:underline') : 'opacity-0'}
                  >
                    {crumb.label}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Create Folder trigger */}
          {showFolderInput ? (
            <form onSubmit={handleCreateSubmit} className="flex items-center gap-1.5">
              <Input
                size="xs"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-36 h-7 text-xs"
                autoFocus
              />
              <Button type="submit" size="xs" variant="outline" className="size-7 p-0">
                <CheckIcon className="size-3.5 text-primary" />
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => {
                  setShowFolderInput(false);
                  setNewFolderName('');
                }}
                className="size-7 p-0"
              >
                <XIcon className="size-3.5 text-muted-foreground" />
              </Button>
            </form>
          ) : (
            <Button
              size="xs"
              variant="outline"
              onClick={() => setShowFolderInput(true)}
              disabled={loading || !currentBucket}
            >
              <FolderPlusIcon className="mr-1.5 size-3.5" />
              New Folder
            </Button>
          )}

          <Button
            size="xs"
            onClick={onUploadFile}
            disabled={loading || !currentBucket}
          >
            <UploadSimpleIcon className="mr-1.5 size-3.5" />
            Upload
          </Button>

          <Button
            size="xs"
            variant="ghost"
            onClick={onRefresh}
            disabled={loading || !currentBucket}
            className="size-7 p-0"
          >
            <ArrowClockwiseIcon className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {/* Local search filtering */}
        <div className="relative w-72">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            size="xs"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files in current directory…"
            className="pl-8 text-xs h-7 w-full"
            disabled={!currentBucket}
          />
        </div>
      </div>
    </div>
  );
}
