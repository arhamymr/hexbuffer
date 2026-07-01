import React from 'react';
import {
  FileTextIcon,
  DotsSixVerticalIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import { useSortable, isSortable } from '@dnd-kit/react/sortable';
import { type ReconDocument, type CustomSection } from '../types';
import { type EditorFileId } from '../lib/editor-files';
import { useDocumentsExplorer } from './hooks/use-documents-explorer';

interface DocumentsExplorerProps {
  activeDocument: ReconDocument;
  activeFileId: EditorFileId;
  onOpenFile: (fileId: EditorFileId) => void;
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
          <DotsSixVerticalIcon className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/50 active:cursor-grabbing" />
          <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{section.title.toLowerCase()}.md</span>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onOpenFile(fileId)} className="text-xs">
          <FileTextIcon className="mr-2 size-3" /> Open
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onRenameCustomSection(section)} className="text-xs">
          <PencilIcon className="mr-2 size-3" /> Rename file
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onRemoveCustomSection(section.key)}
          variant="destructive"
          className="text-xs"
        >
          <TrashIcon className="mr-2 size-3" /> Delete file
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

export function DocumentsExplorer({
  activeDocument,
  activeFileId,
  onOpenFile,
  onAddCustomSection,
  onRenameCustomSection,
  onRemoveCustomSection,
  onReorderCustomSections,
}: DocumentsExplorerProps) {
  const { handleDragEnd } = useDocumentsExplorer({ onReorderCustomSections });

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
              <PlusIcon className="h-4 w-4" />
              <span className="truncate">add file</span>
            </button>
          </div>
          <DragOverlay className="rounded border bg-popover shadow-lg">
            {(source) => {
              const section = activeDocument.customSections.find(
                (s) => s.key === source.id
              );
              return (
                <div className="flex h-7 items-center gap-2 px-2 text-xs">
                  <DotsSixVerticalIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  <FileTextIcon className="h-4 w-4 text-muted-foreground" />
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
