import { Circle, FileCode2, SplitSquareVertical, X } from 'lucide-react';
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
import { getLanguageFromPath, isImageFile } from '../types';
import type { OpenTab } from '../types';
import { useCodeEditor } from './hooks/use-code-editor';
import type { SecondaryLayout, SecondaryPane } from './hooks/use-code-editor';

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

  // ── Image preview sub-component ──
  function ImagePreview({ src, alt }: { src: string; alt: string }) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#1e1e1e] p-4">
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain rounded"
        />
      </div>
    );
  }

  // ── Shared tab bar sub-component ──
  function TabBar({
    tabs: tabList,
    activePath,
    onTabClick,
    onTabClose: onClose,
    dirtyMap,
    onSplit,
    onClosePane,
  }: {
    tabs: OpenTab[];
    activePath: string | null;
    onTabClick: (path: string) => void;
    onTabClose: (tab: OpenTab) => void;
    dirtyMap?: Record<string, boolean>;
    onSplit?: () => void;
    onClosePane?: () => void;
  }) {
    return (
      <div className="flex shrink-0 items-center border-b bg-muted">
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          {tabList.map((tab) => {
            const isActive = tab.path === activePath;
            const isDirty = dirtyMap ? dirtyMap[tab.path] : tab.isDirty;
            return (
              <button
                key={tab.path}
                className={`group flex h-9 max-w-[220px] items-center gap-1.5 border-r px-3 text-xs whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-background text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
                onClick={() => onTabClick(tab.path)}
                type="button"
              >
                <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-[120px] truncate">{tab.name}</span>
                {isDirty && (
                  <Circle className="h-1.5 w-1.5 shrink-0 fill-current text-amber-500" />
                )}
                <span
                  className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab);
                  }}
                  role="button"
                  aria-label={`Close ${tab.name}`}
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </div>
        {onSplit && workspacePath && (
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center border-l text-muted-foreground hover:bg-muted/50"
            onClick={onSplit}
            aria-label="Split editor"
            type="button"
          >
            <SplitSquareVertical className="h-4 w-4" />
          </button>
        )}
        {onClosePane && (
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center border-l text-muted-foreground hover:bg-muted/50"
            onClick={onClosePane}
            aria-label="Close pane"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // ── Status bar sub-component ──
  function StatusBar({ filePath, language }: { filePath: string | null; language: string }) {
    return (
      <div className="flex h-7 shrink-0 items-center justify-between border-t bg-muted/40 px-3 text-[11px] text-muted-foreground">
        <span className="min-w-0 truncate">{filePath ?? 'No file selected'}</span>
        <span className="shrink-0 uppercase">{language || 'text'}</span>
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
                onChange={(value) => {
                  if (pane.activePath) {
                    handleSecondaryContentChange(pane.id, pane.activePath, value);
                  }
                }}
                className="h-full w-full"
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
        />

        <div className="min-h-0 flex-1 overflow-hidden">
          {activeTabPath && isImageFile(activeTabPath) ? (
            <ImagePreview src={activeContent} alt={activeTabPath} />
          ) : (
            <MonacoEditor
              value={activeContent}
              language={activeLanguage}
              path={activeTabPath}
              onChange={(value) => {
                if (activeTabPath) {
                  onContentChange(activeTabPath, value);
                }
              }}
              className="h-full w-full"
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
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              {activeTabPath && isImageFile(activeTabPath) ? (
                <ImagePreview src={activeContent} alt={activeTabPath} />
              ) : (
                <MonacoEditor
                  value={activeContent}
                  language={activeLanguage}
                  path={activeTabPath}
                  onChange={(value) => {
                    if (activeTabPath) {
                      onContentChange(activeTabPath, value);
                    }
                  }}
                  className="h-full w-full"
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
