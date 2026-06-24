import { FileText, Server, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ReconDocument } from '../types';
import { getFileName, type EditorFileId } from '../lib/editor-files';

interface EditorTabStripProps {
  activeDocument: ReconDocument;
  activeFileId: EditorFileId;
  openFileIds: EditorFileId[];
  onOpenFile: (fileId: EditorFileId) => void;
  onCloseFile: (fileId: EditorFileId) => void;
}

export function EditorTabStrip({
  activeDocument,
  activeFileId,
  openFileIds,
  onOpenFile,
  onCloseFile,
}: EditorTabStripProps) {
  return (
    <div className="flex h-full min-w-0 flex-1 overflow-x-auto">
      {openFileIds.map((fileId) => {
        const apiEntry = fileId.startsWith('api:')
          ? activeDocument.apiEntries.find((entry) => fileId === `api:${entry.id}`) ?? null
          : null;
        const isActive = activeFileId === fileId;
        const Icon = fileId.startsWith('api:') ? Server : FileText;
        const fileName = getFileName(fileId, apiEntry, activeDocument.customSections);

        return (
          <button
            key={fileId}
            type="button"
            onClick={() => onOpenFile(fileId)}
            className={cn(
              'group flex h-full min-w-0 max-w-52 shrink-0 items-center gap-2 border-r px-3 text-left text-xs text-muted-foreground hover:bg-muted/60',
              isActive && 'bg-background text-foreground'
            )}
            title={fileName}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{fileName}</span>
            <span
              role="button"
              tabIndex={0}
              aria-label={`Close ${fileName}`}
              className="ml-1 rounded p-0.5 opacity-0 hover:bg-muted group-hover:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                onCloseFile(fileId);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  onCloseFile(fileId);
                }
              }}
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
