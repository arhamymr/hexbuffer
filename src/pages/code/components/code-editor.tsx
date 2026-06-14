import { useCallback, useEffect, useState } from 'react';
import { Circle, FileCode2, X } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { MonacoEditor } from '@/components/ui/monaco-editor';
import type { OpenTab } from '../types';

interface CodeEditorProps {
  tabs: OpenTab[];
  activeTabPath: string | null;
  activeContent: string;
  activeLanguage: string;
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
  onTabChange,
  onTabClose,
  onContentChange,
  onSave,
}: CodeEditorProps) {
  const [pendingClose, setPendingClose] = useState<OpenTab | null>(null);

  const handleTabClose = useCallback(
    (tab: OpenTab) => {
      if (tab.isDirty) {
        setPendingClose(tab);
      } else {
        onTabClose(tab.path);
      }
    },
    [onTabClose],
  );

  const confirmClose = useCallback(() => {
    if (pendingClose) {
      onTabClose(pendingClose.path);
      setPendingClose(null);
    }
  }, [pendingClose, onTabClose]);

  // Keyboard shortcut: Ctrl/Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (activeTabPath) {
          onSave(activeTabPath);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabPath, onSave]);

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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 items-center border-b bg-muted/60">
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.path === activeTabPath;
            return (
              <button
                key={tab.path}
                className={`group flex h-9 max-w-[220px] items-center gap-1.5 border-r px-3 text-xs whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-background text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
                onClick={() => onTabChange(tab.path)}
                type="button"
              >
                <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-[120px] truncate">{tab.name}</span>
                {tab.isDirty && (
                  <Circle className="h-1.5 w-1.5 shrink-0 fill-current text-amber-500" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-0.5 h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTabClose(tab);
                  }}
                  aria-label={`Close ${tab.name}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
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
      </div>

      <div className="flex h-7 shrink-0 items-center justify-between border-t bg-muted/40 px-3 text-[11px] text-muted-foreground">
        <span className="min-w-0 truncate">{activeTabPath ?? 'No file selected'}</span>
        <span className="shrink-0 uppercase">{activeLanguage || 'text'}</span>
      </div>

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
