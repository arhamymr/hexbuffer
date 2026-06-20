import React from 'react';
import {
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  Folder,
  FolderOpen,
  GripVertical,
  Pencil,
  Plus,
  Send,
  Server,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { DragDropProvider, DragOverlay, type DragEndEvent } from '@dnd-kit/react';
import { useSortable, isSortable } from '@dnd-kit/react/sortable';
import { type ReconDocument, type SavedApiEntry, type CustomSection } from '../types';
import { type EditorFileId } from '../lib/editor-files';
import { useDocumentsExplorer } from './hooks/use-documents-explorer';

interface DocumentsExplorerProps {
  activeDocument: ReconDocument;
  activeFileId: EditorFileId;
  isApiFolderOpen: boolean;
  onApiFolderOpenChange: (isOpen: boolean) => void;
  onOpenFile: (fileId: EditorFileId) => void;
  onOpenApiEntry: (entryId: string) => void;
  onAddApiEntry: () => void;
  onDeleteApiEntry: (entryId: string) => void;
  onAddCustomSection: () => void;
  onRenameCustomSection: (section: CustomSection) => void;
  onRemoveCustomSection: (sectionKey: string) => void;
  onReorderCustomSections: (fromIndex: number, toIndex: number) => void;
}

interface ReportFileRowProps {
  section: CustomSection;
  isActive: boolean;
  isDragging?: boolean;
  onOpenFile: (fileId: EditorFileId) => void;
  onRenameCustomSection: (section: CustomSection) => void;
  onRemoveCustomSection: (sectionKey: string) => void;
}

function ReportFileRow({
  section,
  isActive,
  isDragging,
  onOpenFile,
  onRenameCustomSection,
  onRemoveCustomSection,
}: ReportFileRowProps) {
  const fileId: EditorFileId = `custom:${section.key}`;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          onClick={() => {
            if (!isDragging) {
              onOpenFile(fileId);
            }
          }}
          className={cn(
            'flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs hover:bg-muted',
            isActive && 'bg-muted text-foreground'
          )}
        >
          <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/50 active:cursor-grabbing" />
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{section.title.toLowerCase()}.md</span>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onOpenFile(fileId)} className="text-xs">
          <FileText className="mr-2 size-3" /> Open
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onRenameCustomSection(section)} className="text-xs">
          <Pencil className="mr-2 size-3" /> Rename file
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onRemoveCustomSection(section.key)}
          variant="destructive"
          className="text-xs"
        >
          <Trash2 className="mr-2 size-3" /> Delete file
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

interface SortableReportFileRowProps extends ReportFileRowProps {
  index: number;
}

function SortableReportFileRow({ index, ...props }: SortableReportFileRowProps) {
  const { ref, isDragging } = useSortable({
    id: props.section.key,
    index,
    type: 'custom-section',
  });

  return (
    <div
      ref={ref}
      className={cn(
        'relative',
        isDragging && 'z-50 opacity-50'
      )}
    >
      <ReportFileRow {...props} isDragging={isDragging} />
    </div>
  );
}

interface ApiRequestRowProps {
  entry: SavedApiEntry;
  isActive: boolean;
  onOpenApiEntry: (entryId: string) => void;
  onCopyCurlCommand: (entry: SavedApiEntry) => void;
  onCopyUrl: (entry: SavedApiEntry) => void;
  onOpenInInvoker: (entry: SavedApiEntry) => void;
  onOpenInRepeater: (entry: SavedApiEntry) => void;
  onDeleteApiEntry: (entryId: string) => void;
}

function ApiRequestRow({
  entry,
  isActive,
  onOpenApiEntry,
  onCopyCurlCommand,
  onCopyUrl,
  onOpenInInvoker,
  onOpenInRepeater,
  onDeleteApiEntry,
}: ApiRequestRowProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
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
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onOpenApiEntry(entry.id)} className="text-xs">
          <FileText className="mr-2 size-3" /> Open
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onCopyCurlCommand(entry)} className="text-xs">
          <Copy className="mr-2 size-3" /> Copy as curl command (bash)
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onCopyUrl(entry)} className="text-xs">
          <Copy className="mr-2 size-3" /> Copy URL
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onOpenInInvoker(entry)} className="text-xs">
          <ExternalLink className="mr-2 h-4 w-4" /> Open in Invoker
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onOpenInRepeater(entry)} className="text-xs">
          <Send className="mr-2 h-4 w-4" /> Send to Repeater
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onDeleteApiEntry(entry.id)}
          variant="destructive"
          className="text-xs"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function DocumentsExplorer({
  activeDocument,
  activeFileId,
  isApiFolderOpen,
  onApiFolderOpenChange,
  onOpenFile,
  onOpenApiEntry,
  onAddApiEntry,
  onDeleteApiEntry,
  onAddCustomSection,
  onRenameCustomSection,
  onRemoveCustomSection,
  onReorderCustomSections,
}: DocumentsExplorerProps) {
  const {
    handleCopyCurlCommand,
    handleCopyUrl,
    handleOpenInInvoker,
    handleOpenInRepeater,
    handleDragEnd,
  } = useDocumentsExplorer({ onReorderCustomSections });

  return (
    <aside className="flex h-full min-h-0 flex-col border-r bg-muted/25">
      <div className="flex h-8 shrink-0 items-center px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Explorer
      </div>
      <div className="min-h-0 flex-1 overflow-auto pb-3">
        <DragDropProvider onDragEnd={handleDragEnd}>
          <div className="mt-1 space-y-0.5">
            {activeDocument.customSections.map((section, index) => {
              const isActive = activeFileId === `custom:${section.key}`;

              return (
                <SortableReportFileRow
                  key={section.key}
                  index={index}
                  section={section}
                  isActive={isActive}
                  onOpenFile={onOpenFile}
                  onRenameCustomSection={onRenameCustomSection}
                  onRemoveCustomSection={onRemoveCustomSection}
                />
              );
            })}

          <button
            type="button"
            onClick={onAddCustomSection}
            className="flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            <span className="truncate">add file</span>
          </button>

          <ContextMenu>
            <ContextMenuTrigger asChild>
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
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={onAddApiEntry} className="text-xs">
                <Plus className="mr-2 size-3" /> New request
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          {isApiFolderOpen && (
            <div className="space-y-0.5 pl-5">
              {activeDocument.apiEntries.length === 0 ? (
                <div className="space-y-1 px-2 py-2 text-xs text-muted-foreground">
                  <div>No saved requests</div>
                  <button
                    type="button"
                    onClick={onAddApiEntry}
                    className="flex h-7 items-center gap-2 rounded text-xs hover:text-foreground"
                  >
                    <Plus className="size-3" />
                    <span>new request</span>
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onAddApiEntry}
                    className="flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="truncate">new request</span>
                  </button>
                  {activeDocument.apiEntries.map((entry) => {
                    const isActive = activeFileId === `api:${entry.id}`;

                    return (
                      <ApiRequestRow
                        key={entry.id}
                        entry={entry}
                        isActive={isActive}
                        onOpenApiEntry={onOpenApiEntry}
                        onCopyCurlCommand={handleCopyCurlCommand}
                        onCopyUrl={handleCopyUrl}
                        onOpenInInvoker={handleOpenInInvoker}
                        onOpenInRepeater={handleOpenInRepeater}
                        onDeleteApiEntry={onDeleteApiEntry}
                      />
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
          <DragOverlay className="rounded border bg-popover shadow-lg">
            {(source) => {
              const section = activeDocument.customSections.find(
                (s) => s.key === source.id
              );
              return (
                <div className="flex h-7 items-center gap-2 px-2 text-xs">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{section?.title.toLowerCase() ?? String(source.id)}.md</span>
                </div>
              );
            }}
          </DragOverlay>
        </DragDropProvider>
      </div>
    </aside>
  );
}
