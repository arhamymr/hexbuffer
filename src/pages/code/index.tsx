import { useRef, useCallback, useEffect } from 'react';
import { usePlaygroundPage } from './hooks/use-playground-page';
import { GetStartedCard } from './components/get-started-card';
import { FileTree } from './components/file-tree';
import { CodeEditor } from './components/code-editor';
import { PlaygroundToolbar } from './components/playground-toolbar';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { useGlobalTerminalStore } from '@/stores/global-terminal';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';

export function PlaygroundPage() {
  const {
    tabs,
    activeTabId,
    activeTab,
    setActiveTab,
    closeTab,
    closeTabsToLeft,
    closeTabsToRight,
    project,
    systemInfo,
    isLoadingSystemInfo,
    systemInfoError,
    existingProjects,
    isLoadingProjects,
    fileTree,
    openTabs,
    activeTabPath,
    activeContent,
    activeLanguage,
    buildOutput,
    isBuilding,
    buildHistory,
    handleCreateProject,
    handleOpenExistingProject,
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
    setActiveTab: setActiveEditorTab,
    clearBuildHistory,
  } = usePlaygroundPage();

  // ── Write build output to the global footer terminal ──
  const writeStore = useGlobalTerminalStore((s) => s.writeln);
  const requestOpen = useGlobalTerminalStore((s) => s.requestOpen);
  const lastBuildOutputRef = useRef('');

  useEffect(() => {
    if (isBuilding) {
      const lastEntry = buildHistory.length > 0 ? buildHistory[buildHistory.length - 1] : null;
      const cmd = lastEntry?.command ?? '';
      const key = `building:${cmd}`;
      if (key === lastBuildOutputRef.current) return;
      lastBuildOutputRef.current = key;
      writeStore(`\x1b[1;34m$ ${cmd}\x1b[0m`);
      writeStore('\x1b[90m...\x1b[0m');
      return;
    }

    const out = buildOutput;
    if (!out) return;

    const lastEntry = buildHistory.length > 0 ? buildHistory[buildHistory.length - 1] : null;
    const cmd = lastEntry?.command ?? '';
    const key = `${cmd}:${out.stdout}:${out.stderr}:${out.exitCode}`;
    if (key === lastBuildOutputRef.current) return;
    lastBuildOutputRef.current = key;

    writeStore(`\x1b[1;34m$ ${cmd}\x1b[0m`);

    if (out.stdout) {
      const lines = out.stdout.replace(/\r\n/g, '\n').split('\n');
      for (const line of lines) {
        writeStore(`\x1b[37m${line}\x1b[0m`);
      }
    }

    if (out.stderr) {
      const color = out.success ? '\x1b[33m' : '\x1b[31m';
      const lines = out.stderr.replace(/\r\n/g, '\n').split('\n');
      for (const line of lines) {
        writeStore(`${color}${line}\x1b[0m`);
      }
    }

    if (!out.stdout && !out.stderr) {
      writeStore('\x1b[90m(no output)\x1b[0m');
    }

    const exitColor = out.success ? '\x1b[32m' : '\x1b[31m';
    writeStore(`${exitColor}→ exit code: ${out.exitCode}\x1b[0m`);
  }, [buildOutput, isBuilding, buildHistory, writeStore]);

  // ── Auto-open global terminal on build/run ──
  const handleBuildAndShow = useCallback(() => {
    requestOpen();
    handleBuild();
  }, [handleBuild, requestOpen]);

  const handleRunAndShow = useCallback(() => {
    requestOpen();
    handleRun();
  }, [handleRun, requestOpen]);

  // ── Landing tab content ──
  const isLanding = !activeTab?.project;
  const landingContent = isLanding ? (
    <div className="h-full overflow-hidden">
      <GetStartedCard
        systemInfo={systemInfo}
        isLoadingSystemInfo={isLoadingSystemInfo}
        systemInfoError={systemInfoError}
        existingProjects={existingProjects}
        isLoadingProjects={isLoadingProjects}
        onCreateProject={handleCreateProject}
        onOpenProject={handleOpenExistingProject}
      />
    </div>
  ) : null;

  // ── Project tab content (no embedded terminal — uses global footer terminal) ──
  const projectContent = !isLanding && project ? (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <PlaygroundToolbar
        project={project}
        isBuilding={isBuilding}
        onBuild={handleBuildAndShow}
        onRun={handleRunAndShow}
        onNewFile={() => handleNewFile('', 'untitled.txt')}
        onRefresh={handleRefreshTree}
        onCloseProject={handleCloseProject}
      />

      <main className="min-h-0 flex-1">
        <ResizablePanelGroup orientation="horizontal" className="min-h-0">
          <ResizablePanel defaultSize={24} minSize={18}>
            <FileTree
              files={fileTree}
              activePath={activeTabPath}
              onFileClick={handleOpenFile}
              onNewFile={handleNewFile}
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
              onTabChange={setActiveEditorTab}
              onTabClose={handleTabClose}
              onContentChange={handleContentChange}
              onSave={handleSaveFile}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  ) : null;

  return (
    <TabbedPageLayout
      tabs={tabs}
      activeTabId={activeTabId ?? ''}
      onTabChange={setActiveTab}
      onTabClose={closeTab}
      onCloseTabsToLeft={closeTabsToLeft}
      onCloseTabsToRight={closeTabsToRight}
      onTabAdd={() => {
        const landing = tabs.find((t) => t.id === '__playground_landing__');
        if (landing) setActiveTab(landing.id);
      }}
      contentClassName="flex-1 border rounded-md overflow-hidden bg-background min-h-0"
    >
      {isLanding ? landingContent : projectContent}
    </TabbedPageLayout>
  );
}
