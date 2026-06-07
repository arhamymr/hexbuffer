import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { type ReconDocument } from '../types';

interface DocumentsToolbarProps {
  activeDocument: ReconDocument;
  activeFileName: string;
  exporting: boolean;
  canPreviewMarkdown: boolean;
  markdownMode: 'edit' | 'preview';
  onNewDocument: () => void;
  onExportPdf: () => void;
  onMarkdownModeChange: (mode: 'edit' | 'preview') => void;
  onTitleChange: (title: string) => void;
}

export function DocumentsToolbar({
  activeDocument,
  activeFileName,
  exporting,
  canPreviewMarkdown,
  markdownMode,
  onNewDocument,
  onExportPdf,
  onMarkdownModeChange,
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
        <ToggleGroup
          type="single"
          value={markdownMode}
          onValueChange={(value) => {
            if (value === 'edit' || value === 'preview') {
              onMarkdownModeChange(value);
            }
          }}
          className="h-7 rounded border bg-background"
        >
          <ToggleGroupItem value="edit" size="sm" className="h-6 px-2 text-[11px]">
            Edit
          </ToggleGroupItem>
          <ToggleGroupItem value="preview" size="sm" className="h-6 px-2 text-[11px]">
            Preview
          </ToggleGroupItem>
        </ToggleGroup>
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
