import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HardDriveIcon,
  GearSixIcon,
  ShieldWarningIcon,
  CheckCircleIcon,
  CloudArrowDownIcon,
  CopyIcon,
  LinkSimpleIcon,
  UploadSimpleIcon,
  DownloadSimpleIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { cn } from '@/lib/utils';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useFileExplorer } from './hooks/use-file-explorer';
import { useLocalStorage, LOCAL_STORAGE_DIR_NAME } from './hooks/use-local-storage';
import { ExplorerSidebar } from './components/explorer-sidebar';
import { ExplorerDetailsPane } from './components/explorer-details-pane';
import { FileGrid } from './components/file-grid';
import { FileToolbar } from './components/file-toolbar';
import { ContextMenuSeparator, ContextMenuItem } from '@/components/ui/context-menu';

type ActiveTab = 'r2' | 'local';
type ViewMode = 'list' | 'grid';

export function FileExplorerPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<ActiveTab>('r2');

  // Persist viewMode in localStorage across sessions
  const [viewMode, setViewMode] = React.useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('explorer_view_mode');
      return (saved as ViewMode) === 'grid' ? 'grid' : 'list';
    } catch {
      return 'list';
    }
  });

  const handleViewModeChange = React.useCallback((mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('explorer_view_mode', mode);
    } catch (e) {
      console.warn('Failed to save view mode to localStorage:', e);
    }
  }, []);

  const explorer = useFileExplorer();
  const local = useLocalStorage();

  const [localRenamingPath, setLocalRenamingPath] = React.useState<string | null>(null);
  const [localRenameValue, setLocalRenameValue] = React.useState('');
  const localRenameInputRef = React.useRef<HTMLInputElement>(null);

  const {
    loading,
    credentials,
    buckets,
    currentBucket,
    setCurrentBucket,
    currentPrefix,
    items,
    selectedItem,
    setSelectedItem,
    uploadProgress,
    cacheStatus,
    searchQuery,
    setSearchQuery,
    navigateToFolder,
    navigateUp,
    handleCopyPublicUrl,
    handleCopyPresignedUrl,
    handleCreateFolder,
    handleDeleteItem,
    deletingKey,
    handleUploadFile,
    handleOpenFile,
    handleAddCustomBucket,
    handleRemoveBucket,
    refreshList,
  } = explorer;

  // Build R2 breadcrumbs list
  const r2Breadcrumbs = React.useMemo(() => {
    const parts = currentPrefix.split('/').filter(Boolean);
    const crumbs = [{ label: currentBucket || 'R2 Bucket', id: '' }];

    let pathAcc = '';
    parts.forEach((part) => {
      pathAcc += `${part}/`;
      crumbs.push({
        label: part,
        id: pathAcc,
      });
    });

    return crumbs;
  }, [currentBucket, currentPrefix]);

  // Build Local breadcrumbs list with clickable navigation paths
  const localBreadcrumbs = React.useMemo(() => {
    if (!local.rootDir || !local.currentPath) {
      return [{ label: LOCAL_STORAGE_DIR_NAME, id: local.rootDir }];
    }
    const relative = local.currentPath.slice(local.rootDir.length).replace(/^[/\\]/, '');
    const parts = relative ? relative.split(/[/\\]/) : [];

    const crumbs = [{ label: LOCAL_STORAGE_DIR_NAME, id: local.rootDir }];
    let accPath = local.rootDir;

    parts.forEach((part) => {
      const sep = local.currentPath.includes('\\') ? '\\' : '/';
      accPath = `${accPath}${sep}${part}`;
      crumbs.push({
        label: part,
        id: accPath,
      });
    });

    return crumbs;
  }, [local.rootDir, local.currentPath]);

  // Local renaming state management callbacks
  const localStartRename = React.useCallback((e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    setLocalRenamingPath(item.id);
    setLocalRenameValue(item.name);
    setTimeout(() => localRenameInputRef.current?.select(), 0);
  }, []);

  const localCommitRename = React.useCallback((item: any) => {
    const orig = local.items.find(i => i.path === item.id);
    if (orig && localRenameValue.trim() && localRenameValue !== orig.name) {
      local.handleRenameItem(orig, localRenameValue);
    }
    setLocalRenamingPath(null);
  }, [local.items, localRenameValue, local.handleRenameItem]);

  const localCancelRename = React.useCallback(() => {
    setLocalRenamingPath(null);
  }, []);

  // Render Onboarding state if credentials are not configured
  if (!loading && !credentials && activeTab === 'r2') {
    return (
      <div className="h-full flex flex-col bg-background relative overflow-hidden select-none">
        {/* Tab bar even in the onboarding state so user can switch to Local */}
        <div className="border-b border-border px-3 h-10 flex items-center shrink-0">
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full border border-border bg-muted/10 p-6 rounded-lg text-center backdrop-blur-sm select-none">
            <HardDriveIcon className="size-12 text-primary mx-auto mb-4 animate-pulse" />
            <h2 className="text-base font-semibold text-foreground">
              Cloudflare R2 Storage Not Configured
            </h2>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              R2 offers S3-compatible object storage with zero egress fees. To browse your buckets
              and manage files, please set up your account credentials in Settings.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                onClick={() => navigate('/settings?tab=r2')}
                className="text-xs font-semibold"
              >
                <GearSixIcon className="mr-1.5 size-4" />
                Configure Credentials
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden select-none">
      {/* Tab bar */}
      <div className="border-b border-border px-3 h-10 flex items-center gap-3 shrink-0">
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'local' && local.rootDir && (
          <span className="text-[10px] text-muted-foreground font-mono truncate">
            {local.rootDir}
          </span>
        )}
      </div>

      {/* Main workspace */}
      <div className="flex-1 flex min-h-0 relative">
        {activeTab === 'r2' ? (
          <>
            <ExplorerSidebar
              buckets={buckets}
              currentBucket={currentBucket}
              onSelectBucket={(b) => {
                setCurrentBucket(b);
                setSelectedItem(null);
              }}
              onAddCustomBucket={handleAddCustomBucket}
              onRemoveBucket={handleRemoveBucket}
              loading={loading}
            />

            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <FileToolbar
                breadcrumbs={r2Breadcrumbs}
                isAtRoot={!currentPrefix}
                onNavigateUp={navigateUp}
                onNavigateTo={navigateToFolder}
                onCreateFolder={handleCreateFolder}
                actionLabel="Upload"
                actionIcon={<UploadSimpleIcon className="mr-1.5 size-3.5" />}
                onActionClick={handleUploadFile}
                actionDisabled={!currentBucket}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onRefresh={refreshList}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                loading={loading}
              />

              <ResizablePanelGroup orientation="horizontal" className="flex-1 w-full min-h-0">
                <ResizablePanel defaultSize={70} minSize={30}>
                  <FileGrid
                    items={items.map((item) => ({ ...item, id: item.key }))}
                    selectedItem={selectedItem ? { ...selectedItem, id: selectedItem.key } : null}
                    loading={loading}
                    deletingId={deletingKey}
                    onSelectItem={(item) => setSelectedItem(items.find((i) => i.key === item.id) ?? null)}
                    onDoubleClickItem={(item) => {
                      const orig = items.find((i) => i.key === item.id);
                      if (orig) {
                        if (orig.type === 'folder') {
                          navigateToFolder(orig.key);
                        } else {
                          void handleOpenFile(orig);
                        }
                      }
                    }}
                    onDeleteItem={(item) => {
                      const orig = items.find((i) => i.key === item.id);
                      if (orig) void handleDeleteItem(orig);
                    }}
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
                      const orig = items.find((i) => i.key === item.id);
                      if (item.type !== 'file' || !orig) return null;
                      return (
                        <>
                          <ContextMenuSeparator />
                          {handleCopyPublicUrl && (
                            <ContextMenuItem onClick={() => handleCopyPublicUrl(orig)}>
                              <CopyIcon className="mr-2 size-3.5" />
                              <span>Copy Public URL</span>
                            </ContextMenuItem>
                          )}
                          {handleCopyPresignedUrl && (
                            <ContextMenuItem onClick={() => handleCopyPresignedUrl(orig, 3600)}>
                              <LinkSimpleIcon className="mr-2 size-3.5" />
                              <span>Copy Presigned URL</span>
                            </ContextMenuItem>
                          )}
                        </>
                      );
                    }}
                  />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                  <ExplorerDetailsPane
                    item={selectedItem}
                    cacheStatus={cacheStatus}
                    onOpenFile={handleOpenFile}
                    onCopyPublicUrl={handleCopyPublicUrl}
                    onCopyPresignedUrl={handleCopyPresignedUrl}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </>
        ) : (
          /* Local Storage tab */
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <FileToolbar
              breadcrumbs={localBreadcrumbs}
              isAtRoot={local.isAtRoot}
              onNavigateUp={local.navigateUp}
              onNavigateTo={local.navigateInto}
              onCreateFolder={local.handleCreateFolder}
              actionLabel="Import"
              actionIcon={<DownloadSimpleIcon className="mr-1.5 size-3.5" />}
              onActionClick={local.handleImportFile}
              searchQuery={local.searchQuery}
              onSearchChange={local.setSearchQuery}
              onRefresh={local.refresh}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              loading={local.loading}
            />
            <div className="flex-1 flex min-h-0">
              <FileGrid
                items={local.items.map((item) => ({ ...item, id: item.path }))}
                selectedItem={local.selectedItem ? { ...local.selectedItem, id: local.selectedItem.path } : null}
                loading={local.loading}
                deletingId={local.deletingPath}
                onSelectItem={(item) => local.setSelectedItem(local.items.find((i) => i.path === item.id) ?? null)}
                onDoubleClickItem={(item) => {
                  const orig = local.items.find((i) => i.path === item.id);
                  if (orig) void local.handleOpenFile(orig);
                }}
                onDeleteItem={(item) => {
                  const orig = local.items.find((i) => i.path === item.id);
                  if (orig) void local.handleDeleteItem(orig);
                }}
                viewMode={viewMode}
                emptyMessage="Import files or create a sub-folder to get started."
                renamingId={localRenamingPath}
                renameValue={localRenameValue}
                onRenameStart={localStartRename}
                onRenameChange={setLocalRenameValue}
                onRenameCommit={localCommitRename}
                onRenameCancel={localCancelRename}
                renameInputRef={localRenameInputRef}
              />
            </div>
          </div>
        )}
      </div>

      {/* Concurrent upload progress bar */}
      {uploadProgress && activeTab === 'r2' && (
        <div className="absolute bottom-4 right-4 bg-muted border border-border shadow-md rounded-lg p-3 w-80 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between text-[11px] mb-1.5 font-medium">
            <span className="truncate pr-4 text-foreground">{uploadProgress.fileName}</span>
            <span className="shrink-0 text-primary">{uploadProgress.progress}%</span>
          </div>
          <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.progress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <ShieldWarningIcon className="size-3.5 text-primary shrink-0" />
            Uploading to R2 Buckets concurrently…
          </p>
        </div>
      )}
    </div>
  );
}

function TabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}) {
  return (
    <ButtonGroup>
      <Button
        variant="outline"
        size="sm"
        className={cn('text-xs', activeTab === 'r2' && 'text-primary')}
        data-state={activeTab === 'r2' ? 'on' : 'off'}
        onClick={() => onTabChange('r2')}
      >
        R2 Storage
      </Button>
      <Button
        variant="outline"
        size="sm"
        className={cn('text-xs', activeTab === 'local' && 'text-primary')}
        data-state={activeTab === 'local' ? 'on' : 'off'}
        onClick={() => onTabChange('local')}
      >
        Local Files
      </Button>
    </ButtonGroup>
  );
}
