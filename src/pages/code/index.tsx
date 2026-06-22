import { usePlaygroundPage } from './hooks/use-playground-page';
import { WelcomeScreen } from './components/welcome-screen';
import { FileTree } from './components/file-tree';
import { CodeEditor } from './components/code-editor';
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
    handleOpenFolder,
    handleOpenRecentFolder,
    handleCreateProject,
    handleOpenFile,
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
          <ResizablePanel defaultSize={24} minSize={18}>
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
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={76} minSize={40}>
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

