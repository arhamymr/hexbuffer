import * as React from 'react';
import {
  CaretRightIcon,
  FolderPlusIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XIcon,
  ListIcon,
  SquaresFourIcon,
  ArrowClockwiseIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface BreadcrumbCrumb {
  label: string;
  id: string;
}

interface FileToolbarProps {
  breadcrumbs: BreadcrumbCrumb[];
  isAtRoot: boolean;
  onNavigateUp: () => void;
  onNavigateTo: (id: string) => void;
  // Folder Creation
  onCreateFolder: (name: string) => void | Promise<void>;
  // Action (Upload or Import)
  actionLabel: string;
  actionIcon: React.ReactNode;
  onActionClick: () => void;
  actionDisabled?: boolean;
  // Search and Mode
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  loading: boolean;
}

export function FileToolbar({
  breadcrumbs,
  isAtRoot,
  onNavigateUp,
  onNavigateTo,
  onCreateFolder,
  actionLabel,
  actionIcon,
  onActionClick,
  actionDisabled = false,
  searchQuery,
  onSearchChange,
  onRefresh,
  viewMode,
  onViewModeChange,
  loading,
}: FileToolbarProps) {
  const [showFolderInput, setShowFolderInput] = React.useState(false);
  const [folderNameInput, setFolderNameInput] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderNameInput.trim()) return;
    setCreating(true);
    try {
      await onCreateFolder(folderNameInput.trim());
      setFolderNameInput('');
      setShowFolderInput(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 border-b border-border bg-background/50 shrink-0">
      <div className="flex items-center justify-between gap-4">
        {/* Breadcrumb path */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none min-w-0">
          <Button
            size="xs"
            variant="ghost"
            onClick={onNavigateUp}
            disabled={isAtRoot || loading}
            className="size-7 p-0 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>

          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground whitespace-nowrap min-w-0">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && <CaretRightIcon className="size-3 text-border shrink-0" />}
                  <button
                    onClick={() => !isLast && onNavigateTo(crumb.id)}
                    disabled={isLast || loading}
                    className={cn(
                      crumb.label ? 'truncate max-w-[160px]' : 'opacity-0',
                      isLast ? 'text-foreground font-semibold' : 'hover:text-foreground hover:underline'
                    )}
                  >
                    {crumb.label}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Create Folder trigger */}
          {showFolderInput ? (
            <form onSubmit={handleCreateSubmit} className="flex items-center gap-1.5">
              <Input
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                placeholder="Folder name"
                className="w-36 h-7 text-xs"
                disabled={creating}
                autoFocus
              />
              <Button type="submit" size="xs" variant="outline" className="size-7 p-0 shrink-0" disabled={creating}>
                <CheckIcon className="size-3.5 text-primary" />
              </Button>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => {
                  setShowFolderInput(false);
                  setFolderNameInput('');
                }}
                className="size-7 p-0 shrink-0"
                disabled={creating}
              >
                <XIcon className="size-3.5 text-muted-foreground" />
              </Button>
            </form>
          ) : (
            <Button
              size="xs"
              variant="outline"
              onClick={() => setShowFolderInput(true)}
              disabled={loading || actionDisabled}
            >
              <FolderPlusIcon className="mr-1.5 size-3.5" />
              New Folder
            </Button>
          )}

          <Button
            size="xs"
            onClick={onActionClick}
            disabled={loading || actionDisabled}
          >
            {actionIcon}
            {actionLabel}
          </Button>

          <Button
            size="xs"
            variant="ghost"
            onClick={onRefresh}
            disabled={loading || actionDisabled}
            className="size-7 p-0 shrink-0"
          >
            <ArrowClockwiseIcon className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {/* Search filtering */}
        <div className="relative w-72">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files in current directory…"
            className="pl-8 text-xs h-7 w-full"
            disabled={actionDisabled}
          />
        </div>

        {/* View Mode Toggle */}
        <ButtonGroup>
          <Button
            variant="outline"
            className={cn('size-7 p-0 hover:text-primary', viewMode === 'list' && 'text-primary')}
            data-state={viewMode === 'list' ? 'on' : 'off'}
            onClick={() => onViewModeChange('list')}
            title="List view"
            disabled={actionDisabled}
          >
            <ListIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            className={cn('size-7 p-0 hover:text-primary', viewMode === 'grid' && 'text-primary')}
            data-state={viewMode === 'grid' ? 'on' : 'off'}
            onClick={() => onViewModeChange('grid')}
            title="Grid view"
            disabled={actionDisabled}
          >
            <SquaresFourIcon className="size-4" />
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}
