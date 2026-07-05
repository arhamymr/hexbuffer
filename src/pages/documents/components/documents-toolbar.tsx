import { DownloadIcon, ArrowClockwiseIcon, ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Input } from '@/components/ui/input';
import { type ReconDocument } from '../types';

interface DocumentsToolbarProps {
  activeDocument: ReconDocument;
  exporting: boolean;
  canPreviewMarkdown: boolean;
  canUndoMarkdown: boolean;
  canRedoMarkdown: boolean;
  onExportPdf: () => void;
  onUndoMarkdown: () => void;
  onRedoMarkdown: () => void;
  onTitleChange: (title: string) => void;
}

export function DocumentsToolbar({
  activeDocument,
  exporting,
  canPreviewMarkdown,
  canUndoMarkdown,
  canRedoMarkdown,
  onExportPdf,
  onUndoMarkdown,
  onRedoMarkdown,
  onTitleChange,
}: DocumentsToolbarProps) {
  return (
    <div className="flex justify-between bg-muted shrink-0 items-center gap-3 border-b bg-background p-1">
      <Input
        value={activeDocument.title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Untitled recon document"
        className="h-7 max-w-72 border-transparent px-2 text-xs font-medium"
      />
      <div className='flex items-center gap-2'>
        {canPreviewMarkdown && (
          <div className="flex items-center gap-1">
            <ButtonGroup>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-7"
                aria-label="Undo"
                title="Undo"
                disabled={!canUndoMarkdown}
                onClick={onUndoMarkdown}
              >
                <ArrowCounterClockwiseIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-7"
                aria-label="Redo"
                title="Redo"
                disabled={!canRedoMarkdown}
                onClick={onRedoMarkdown}
              >
                <ArrowClockwiseIcon className="size-4" />
              </Button>
            </ButtonGroup>
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="xs"
          aria-label="Export as PDF"
          title="Export as PDF"
          onClick={onExportPdf}
          disabled={exporting}
        >
          <DownloadIcon className="size-4" />
          {exporting ? 'Exporting' : 'PDF'}
        </Button>
      </div>
    </div>
  );
}
