import { Download, Redo2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { type MarkdownEditorMode, type ReconDocument } from '../types';

interface DocumentsToolbarProps {
  activeDocument: ReconDocument;
  activeFileName: string;
  exporting: boolean;
  canPreviewMarkdown: boolean;
  markdownMode: MarkdownEditorMode;
  canUndoMarkdown: boolean;
  canRedoMarkdown: boolean;
  onNewDocument: () => void;
  onExportPdf: () => void;
  onMarkdownModeChange: (mode: MarkdownEditorMode) => void;
  onUndoMarkdown: () => void;
  onRedoMarkdown: () => void;
  onTitleChange: (title: string) => void;
}

export function DocumentsToolbar({
  activeDocument,
  activeFileName,
  exporting,
  canPreviewMarkdown,
  markdownMode,
  canUndoMarkdown,
  canRedoMarkdown,
  onNewDocument,
  onExportPdf,
  onMarkdownModeChange,
  onUndoMarkdown,
  onRedoMarkdown,
  onTitleChange,
}: DocumentsToolbarProps) {
  return (
    <div className="flex bg-muted shrink-0 items-center gap-3 border-b bg-background p-2">
      <Input
        value={activeDocument.title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Untitled recon document"
        className="h-7 max-w-72 border-transparent px-2 text-xs font-medium"
      />
      <div className="min-w-0 flex-1 truncate font-mono text-[12px] text-muted-foreground">
        documents / {activeFileName}
      </div>
      {canPreviewMarkdown && (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
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
            variant="ghost"
            size="icon-sm"
            className="size-7"
            aria-label="Redo"
            title="Redo"
            disabled={!canRedoMarkdown}
            onClick={onRedoMarkdown}
          >
            <Redo2 className="size-4" />
          </Button>
          <ToggleGroup
            type="single"
            value={markdownMode}
            onValueChange={(value) => {
              if (value === 'markdown' || value === 'code' || value === 'preview') {
                onMarkdownModeChange(value);
              }
            }}
            className="rounded border bg-background"
          >
            <ToggleGroupItem value="markdown" size="sm" className="text-[11px]">
              Markdown
            </ToggleGroupItem>
            <ToggleGroupItem value="code" size="sm" className="ext-[11px]">
              Code
            </ToggleGroupItem>
            <ToggleGroupItem value="preview" size="sm" className="text-[11px]">
              Preview
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
  );
}
