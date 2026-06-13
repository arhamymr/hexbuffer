import { usePlaygroundPage } from './hooks/use-playground-page';
import { GetStartedCard } from './components/get-started-card';
import { FileTree } from './components/file-tree';
import { CodeEditor } from './components/code-editor';
import { BuildOutput } from './components/build-output';
import { PlaygroundToolbar } from './components/playground-toolbar';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

export function PlaygroundPage() {
  const {
    project,
    systemInfo,
    isLoadingSystemInfo,
    systemInfoError,
    fileTree,
    openTabs,
    activeTabPath,
    activeContent,
    activeLanguage,
    buildOutput,
    isBuilding,
    buildHistory,
    handleCreateProject,
    handleOpenFile,
    handleTabClose,
    handleContentChange,
    handleSaveFile,
    handleBuild,
    handleRun,
    handleCloseProject,
    handleRefreshTree,
    handleNewFile,
    handleDeleteFile,
    handleRenameFile,
    setActiveTab,
    clearBuildHistory,
  } = usePlaygroundPage();

  // Get Started view
  if (!project) {
    return (
      <div className="h-full overflow-hidden">
        <GetStartedCard
          systemInfo={systemInfo}
          isLoadingSystemInfo={isLoadingSystemInfo}
          systemInfoError={systemInfoError}
          onCreateProject={handleCreateProject}
        />
      </div>
    );
  }

  // Last command from build history
  const lastEntry = buildHistory.length > 0 ? buildHistory[buildHistory.length - 1] : null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <PlaygroundToolbar
        project={project}
        isBuilding={isBuilding}
        onBuild={handleBuild}
        onRun={handleRun}
        onNewFile={() => handleNewFile('', 'untitled.txt')}
        onRefresh={handleRefreshTree}
        onCloseProject={handleCloseProject}
      />

      <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
        <ResizablePanel defaultSize={20} minSize={14} maxSize={35}>
          <div className="h-full border-r bg-muted/20">
            <FileTree
              files={fileTree}
              activePath={activeTabPath}
              onFileClick={handleOpenFile}
              onNewFile={handleNewFile}
              onDeleteFile={handleDeleteFile}
              onRenameFile={handleRenameFile}
              onRefresh={handleRefreshTree}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={80} minSize={40}>
          <ResizablePanelGroup direction="vertical" className="h-full">
            <ResizablePanel defaultSize={65} minSize={30}>
              <CodeEditor
                tabs={openTabs}
                activeTabPath={activeTabPath}
                activeContent={activeContent}
                activeLanguage={activeLanguage}
                onTabChange={setActiveTab}
                onTabClose={handleTabClose}
                onContentChange={handleContentChange}
                onSave={handleSaveFile}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={35} minSize={12}>
              <BuildOutput
                output={buildOutput}
                isBuilding={isBuilding}
                lastCommand={lastEntry?.command ?? ''}
                onClear={clearBuildHistory}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
