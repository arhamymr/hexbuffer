import { FileCode2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MonacoEditor } from '@/components/ui/monaco-editor';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { getLanguageFromPath, isImageFile } from '../../types';
import type { OpenTab } from '../../types';
import { useCodeEditor } from './hooks/use-code-editor';
import type { SecondaryLayout, SecondaryPane } from './hooks/use-code-editor';
import { TabBar } from './components/tab-bar';
import { StatusBar } from './components/status-bar';
import { ImagePreview } from './components/image-preview';
import { usePlaygroundStore } from '@/stores/playground';
import { useMonacoLsp } from '@/hooks/use-monaco-lsp';

interface CodeEditorProps {
  tabs: OpenTab[];
  activeTabPath: string | null;
  activeContent: string;
  activeLanguage: string;
  workspacePath?: string;
  onTabChange: (path: string) => void;
  onTabClose: (path: string) => void;
  onContentChange: (path: string, content: string) => void;
  onSave: (path: string) => void;
}

export function CodeEditor({
  tabs,
  activeTabPath,
  activeContent,
  activeLanguage,
  workspacePath,
  onTabChange,
  onTabClose,
  onContentChange,
  onSave,
}: CodeEditorProps) {
  const {
    pendingClose,
    setPendingClose,
    confirmClose,
    handleTabClose,
    secondaryLayout,
    secondaryContentRef,
    handleToggleSplit,
    handleSplitSecondaryPane,
    handleCloseSecondaryPane,
    handleSecondaryTabChange,
    handleSecondaryContentChange,
    handleSecondarySave,
    handleSecondaryTabClose,
  } = useCodeEditor({
    tabs,
    activeTabPath,
    workspacePath,
    onTabClose,
    onSave,
  });

  useMonacoLsp(activeLanguage);

  const activeEditorPath = usePlaygroundStore((s) => s.activeEditorPath);
  const activeEditorLine = usePlaygroundStore((s) => s.activeEditorLine);

  if (tabs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2 text-center">
          <FileCode2 className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No file open</p>
          <p className="text-xs text-muted-foreground">
            Select a file from the project tree to start editing.
          </p>
        </div>
      </div>
    );
  }

  // ── Recursive secondary pane renderer ──
  function renderSecondaryLayout(layout: SecondaryLayout): React.ReactNode {
    if (layout.type === 'leaf') {
      return renderSecondaryPane(layout.pane);
    }
    return (
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1 overflow-hidden">
        <ResizablePanel defaultSize={50} minSize={20}>
          {renderSecondaryLayout(layout.left)}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={20}>
          {renderSecondaryLayout(layout.right)}
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  }

  function renderSecondaryPane(pane: SecondaryPane): React.ReactNode {
    const content = pane.activePath
      ? secondaryContentRef.current.get(pane.activePath) ?? ''
      : '';
    const language = pane.activePath
      ? pane.tabs.find((t) => t.path === pane.activePath)?.language ??
        getLanguageFromPath(pane.activePath)
      : '';

    return (
      <div data-pane={pane.id} className="flex h-full flex-col overflow-hidden">
        <TabBar
          tabs={pane.tabs}
          activePath={pane.activePath}
          onTabClick={(path) => handleSecondaryTabChange(pane.id, path)}
          onTabClose={(tab) => handleSecondaryTabClose(pane.id, tab.path)}
          dirtyMap={pane.dirty}
          onSplit={() => handleSplitSecondaryPane(pane.id)}
          onClosePane={() => handleCloseSecondaryPane(pane.id)}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          {pane.activePath ? (
            isImageFile(pane.activePath) ? (
              <ImagePreview src={content} alt={pane.activePath} />
            ) : (
              <MonacoEditor
                value={content}
                language={language}
                path={pane.activePath}
                workspacePath={workspacePath}
                onChange={(value) => {
                  if (pane.activePath) {
                    handleSecondaryContentChange(pane.id, pane.activePath, value);
                  }
                }}
                className="h-full w-full"
                lineNumber={pane.activePath === activeEditorPath ? activeEditorLine : undefined}
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-2 text-center">
                <FileCode2 className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No file open</p>
                <p className="text-xs text-muted-foreground">
                  Click a tab to open a file in this pane.
                </p>
              </div>
            </div>
          )}
        </div>
        <StatusBar filePath={pane.activePath} language={language} />
      </div>
    );
  }

  // ── Non-split layout ──
  if (!secondaryLayout) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
        <TabBar
          tabs={tabs}
          activePath={activeTabPath}
          onTabClick={onTabChange}
          onTabClose={handleTabClose}
          onSplit={handleToggleSplit}
          workspacePath={workspacePath}
        />

        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTabPath && isImageFile(activeTabPath) ? (
            <ImagePreview src={activeContent} alt={activeTabPath} />
          ) : (
            <MonacoEditor
              value={activeContent}
              language={activeLanguage}
              path={activeTabPath ?? undefined}
              workspacePath={workspacePath}
              onChange={(value) => {
                if (activeTabPath) {
                  onContentChange(activeTabPath, value);
                }
              }}
              className="h-full w-full"
              lineNumber={activeTabPath === activeEditorPath ? activeEditorLine : undefined}
            />
          )}
        </div>

        <StatusBar filePath={activeTabPath} language={activeLanguage} />

        <AlertDialog
          open={pendingClose !== null}
          onOpenChange={(open) => {
            if (!open) setPendingClose(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes in <strong>{pendingClose?.name}</strong>. Close without
                saving?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={confirmClose}>
                Close without saving
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ── Split layout ──
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        {/* Primary pane */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <div data-pane="primary" className="flex h-full flex-col overflow-hidden">
            <TabBar
              tabs={tabs}
              activePath={activeTabPath}
              onTabClick={onTabChange}
              onTabClose={handleTabClose}
              onSplit={handleToggleSplit}
              workspacePath={workspacePath}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              {activeTabPath && isImageFile(activeTabPath) ? (
                <ImagePreview src={activeContent} alt={activeTabPath} />
              ) : (
                <MonacoEditor
                  value={activeContent}
                  language={activeLanguage}
                  path={activeTabPath ?? undefined}
                  workspacePath={workspacePath}
                  onChange={(value) => {
                    if (activeTabPath) {
                      onContentChange(activeTabPath, value);
                    }
                  }}
                  className="h-full w-full"
                  lineNumber={activeTabPath === activeEditorPath ? activeEditorLine : undefined}
                />
              )}
            </div>
            <StatusBar filePath={activeTabPath} language={activeLanguage} />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Secondary panes (recursive) */}
        <ResizablePanel defaultSize={50} minSize={20}>
          {renderSecondaryLayout(secondaryLayout)}
        </ResizablePanel>
      </ResizablePanelGroup>

      <AlertDialog
        open={pendingClose !== null}
        onOpenChange={(open) => {
          if (!open) setPendingClose(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in <strong>{pendingClose?.name}</strong>. Close without
              saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmClose}>
              Close without saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
