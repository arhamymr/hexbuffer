import { ChevronDown, FileText, Folder, FolderOpen, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ReconDocument } from '../types';
import {
  EXPLORER_SECTIONS,
  getSectionDefinition,
  type EditorFileId,
} from '../lib/editor-files';

interface DocumentsExplorerProps {
  activeDocument: ReconDocument;
  activeFileId: EditorFileId;
  isApiFolderOpen: boolean;
  onApiFolderOpenChange: (isOpen: boolean) => void;
  onOpenFile: (fileId: EditorFileId) => void;
  onOpenApiEntry: (entryId: string) => void;
}

export function DocumentsExplorer({
  activeDocument,
  activeFileId,
  isApiFolderOpen,
  onApiFolderOpenChange,
  onOpenFile,
  onOpenApiEntry,
}: DocumentsExplorerProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-r bg-muted/25">
      <div className="flex h-8 shrink-0 items-center px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Explorer
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 pb-3">
        <button
          type="button"
          className="flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs font-medium hover:bg-muted"
        >
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{activeDocument.title.trim() || activeDocument.name}</span>
        </button>

        <div className="mt-1 space-y-0.5 pl-5">
          {EXPLORER_SECTIONS.map((sectionKey) => {
            const section = getSectionDefinition(sectionKey);
            const isActive = activeFileId === sectionKey;

            return (
              <button
                key={sectionKey}
                type="button"
                onClick={() => onOpenFile(sectionKey)}
                className={cn(
                  'flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted',
                  isActive && 'bg-muted text-foreground'
                )}
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{section?.title.toLowerCase()}.md</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              onApiFolderOpenChange(!isApiFolderOpen);
              onOpenFile('api');
            }}
            className={cn(
              'flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted',
              activeFileId === 'api' && 'bg-muted text-foreground'
            )}
          >
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform',
                !isApiFolderOpen && '-rotate-90'
              )}
            />
            {isApiFolderOpen ? (
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="truncate">api</span>
          </button>

          {isApiFolderOpen && (
            <div className="space-y-0.5 pl-5">
              {activeDocument.apiEntries.length === 0 ? (
                <div className="px-2 py-2 text-xs text-muted-foreground">
                  No saved requests
                </div>
              ) : (
                activeDocument.apiEntries.map((entry) => {
                  const isActive = activeFileId === `api:${entry.id}`;

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onOpenApiEntry(entry.id)}
                      className={cn(
                        'flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted',
                        isActive && 'bg-muted text-foreground'
                      )}
                      title={entry.url}
                    >
                      <Server className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate font-mono">{entry.path}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
