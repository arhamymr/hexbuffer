import { Download, Redo2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { type MarkdownEditorMode, type ReconDocument } from '../types';

interface DocumentsToolbarProps {
  activeDocument: ReconDocument;
  exporting: boolean;
  canPreviewMarkdown: boolean;
  markdownMode: MarkdownEditorMode;
  canUndoMarkdown: boolean;
  canRedoMarkdown: boolean;
  onExportPdf: () => void;
  onMarkdownModeChange: (mode: MarkdownEditorMode) => void;
  onUndoMarkdown: () => void;
  onRedoMarkdown: () => void;
  onTitleChange: (title: string) => void;
}

export function DocumentsToolbar({
  activeDocument,
  exporting,
  canPreviewMarkdown,
  markdownMode,
  canUndoMarkdown,
  canRedoMarkdown,
  onExportPdf,
  onMarkdownModeChange,
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
          {markdownMode === 'code' &&

            <>
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
                  <Undo2 className="size-4" />
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
                  <Redo2 className="size-4" />
                </Button>
              </ButtonGroup>
            </>}

          <ToggleGroup
            type="single"
            value={markdownMode}
            onValueChange={(value) => {
              if (value === 'markdown' || value === 'code') {
                onMarkdownModeChange(value);
              }
            }}
            className="border rounded-sm bg-background h-7 overflow-hidden"
          >
            <ToggleGroupItem value="markdown" size="sm" className="text-[11px]">
              Markdown
            </ToggleGroupItem>
            <ToggleGroupItem value="code" size="sm" className="ext-[11px]">
              Code
            </ToggleGroupItem>
          </ToggleGroup>
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
        <Download className="size-4" />
        {exporting ? 'Exporting' : 'PDF'}
      </Button>
      </div>
    
    </div>
  );
}
