import { useNavigate } from 'react-router-dom';
import {
  HardDriveIcon,
  GearSixIcon,
  ShieldWarningIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useFileExplorer } from './hooks/use-file-explorer';
import { ExplorerSidebar } from './components/explorer-sidebar';
import { ExplorerToolbar } from './components/explorer-toolbar';
import { ExplorerGrid } from './components/explorer-grid';
import { ExplorerDetailsPane } from './components/explorer-details-pane';

export function FileExplorerPage() {
  const navigate = useNavigate();
  const explorer = useFileExplorer();
  
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
    handleUploadFile,
    handleOpenFile,
    handleAddCustomBucket,
    handleRemoveBucket,
    refreshList,
  } = explorer;

  // Render Onboarding state if credentials are not configured
  if (!loading && !credentials) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full border border-border bg-muted/10 p-6 rounded-lg text-center backdrop-blur-sm select-none">
          <HardDriveIcon className="size-12 text-primary mx-auto mb-4 animate-pulse" />
          <h2 className="text-base font-semibold text-foreground">
            Cloudflare R2 Storage Not Configured
          </h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            R2 offers S3-compatible object storage with zero egress fees. To browse your buckets and manage files, please set up your account credentials in Settings.
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
    );
  }

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden select-none">
      {/* Main Workspace Panels */}
      <div className="flex-1 flex min-h-0 relative">
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
        
        <div className="flex-1 flex flex-col min-w-0">
          <ExplorerToolbar
            currentBucket={currentBucket}
            currentPrefix={currentPrefix}
            onNavigateUp={navigateUp}
            onNavigateToPrefix={navigateToFolder}
            onUploadFile={handleUploadFile}
            onCreateFolder={handleCreateFolder}
            onRefresh={refreshList}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loading={loading}
          />
          
          <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
            <ResizablePanel defaultSize={70} minSize={50}>
              <ExplorerGrid
                items={items}
                selectedItem={selectedItem}
                onSelectItem={setSelectedItem}
                onDoubleClickItem={(item) => {
                  if (item.type === 'folder') {
                    navigateToFolder(item.key);
                  } else {
                    void handleOpenFile(item);
                  }
                }}
                onDeleteItem={handleDeleteItem}
                cacheStatus={cacheStatus}
                loading={loading}
              />
            </ResizablePanel>
            
            <ResizableHandle />
            
            <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
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
      </div>

      {/* Concurrent Upload Progress bar */}
      {uploadProgress && (
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
