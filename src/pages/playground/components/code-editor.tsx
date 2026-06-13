import { useCallback, useEffect, useState } from 'react';
import { X, Circle } from 'lucide-react';
import { TextEditor } from '@/components/ui/text-editor';
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
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          No file open. Select a file from the tree to start editing.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex shrink-0 items-center border-b bg-muted/30">
        <div className="flex flex-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.path === activeTabPath;
            return (
              <button
                key={tab.path}
                className={`group flex items-center gap-1.5 border-r px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-b-2 border-b-primary bg-background text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
                onClick={() => onTabChange(tab.path)}
              >
                <span className="max-w-[120px] truncate">{tab.name}</span>
                {tab.isDirty && (
                  <Circle className="h-1.5 w-1.5 shrink-0 fill-current text-amber-500" />
                )}
                <span
                  className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded opacity-0 hover:bg-muted group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTabClose(tab);
                  }}
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <TextEditor
          key={activeTabPath}
          value={activeContent}
          language={activeLanguage}
          onChange={(value) => {
            if (activeTabPath && value !== undefined) {
              onContentChange(activeTabPath, value);
            }
          }}
        />
      </div>

      {/* Unsaved changes dialog */}
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

