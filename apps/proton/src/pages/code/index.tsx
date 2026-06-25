import { usePlaygroundPage } from './hooks/use-playground-page';
import { WelcomeScreen } from './components/welcome-screen';
import { FileTree } from './components/file-tree';
import { CodeEditor } from './components/code-editor';
import { GitSidebarPanel } from './components/git-sidebar-panel';
import { FolderOpen, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

export function PlaygroundPage() {
  const {
    workspace,
    systemInfo,
    isLoadingSystemInfo,
    systemInfoError,
    recentFolders,
    fileTree,
    openTabs,
    activeTabPath,
    activeContent,
    activeLanguage,
    activeSidebarTab,
    setActiveSidebarTab,
    handleOpenFolder,
    handleOpenRecentFolder,
    handleCreateProject,
    handleOpenFile,
    handleOpenDiff,
    handleTabClose,
    handleContentChange,
    handleSaveFile,
    handleRefreshTree,
    handleNewFile,
    handleNewFolder,
    handleDeleteFile,
    handleRenameFile,
    setActiveEditorTab,
  } = usePlaygroundPage();

  // ── Welcome screen (no folder open) ──
  if (!workspace) {
    return (
      <WelcomeScreen
        onOpenFolder={handleOpenFolder}
        recentFolders={recentFolders}
        onOpenRecent={handleOpenRecentFolder}
        systemInfo={systemInfo}
        isLoadingSystemInfo={isLoadingSystemInfo}
        systemInfoError={systemInfoError}
        onCreateProject={handleCreateProject}
      />
    );
  }

  // ── Workspace view (folder open) ──
  return (
    <div className="flex h-full min-h-0 flex-row overflow-hidden bg-background">
      <main className="min-h-0 min-w-0 flex-1">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          <ResizablePanel defaultSize={26} minSize={20}>
            <div className="flex h-full min-h-0 flex-row">
              {/* Activity Bar (Vertical) */}
              <div className="flex w-12 shrink-0 flex-col items-center border-r bg-muted/10 py-4 gap-3">
                <Button
                  variant={activeSidebarTab === 'explorer' ? 'secondary' : 'ghost'}
                  size="icon"
                  className={`h-9 w-9 rounded-lg ${
                    activeSidebarTab === 'explorer' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  onClick={() => setActiveSidebarTab('explorer')}
                  title="Explorer"
                >
                  <FolderOpen className="h-5 w-5" />
                </Button>
                <Button
                  variant={activeSidebarTab === 'git' ? 'secondary' : 'ghost'}
                  size="icon"
                  className={`h-9 w-9 rounded-lg ${
                    activeSidebarTab === 'git' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  onClick={() => setActiveSidebarTab('git')}
                  title="Source Control"
                >
                  <GitBranch className="h-5 w-5" />
                </Button>
              </div>

              {/* Sidebar Content */}
              <div className="min-w-0 flex-1">
                {activeSidebarTab === 'explorer' ? (
                  <FileTree
                    files={fileTree}
                    activePath={activeTabPath}
                    onFileClick={handleOpenFile}
                    onNewFile={handleNewFile}
                    onNewFolder={handleNewFolder}
                    onDeleteFile={handleDeleteFile}
                    onRenameFile={handleRenameFile}
                    onRefresh={handleRefreshTree}
                  />
                ) : (
                  <GitSidebarPanel
                    workspacePath={workspace.path}
                    onFileDiffClick={handleOpenDiff}
                    onRefreshWorkspace={handleRefreshTree}
                  />
                )}
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={74} minSize={40}>
            <CodeEditor
              tabs={openTabs}
              activeTabPath={activeTabPath}
              activeContent={activeContent}
              activeLanguage={activeLanguage}
              workspacePath={workspace?.path}
              onTabChange={setActiveEditorTab}
              onTabClose={handleTabClose}
              onContentChange={handleContentChange}
              onSave={handleSaveFile}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
