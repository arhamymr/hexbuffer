import {
  type CustomSection,
  type MarkdownEditorMode,
  type ReconDocument,
} from '../types';
import { CustomSectionCodeEditor } from './custom-section-code-editor';
import { CustomSectionEditor } from './custom-section-editor';
import { EditorTabStrip } from './editor-tab-strip';
import { type EditorFileId } from '../lib/editor-files';

interface DocumentsEditorPaneProps {
  activeDocument: ReconDocument;
  activeFileId: EditorFileId;
  openFileIds: EditorFileId[];
  activeCustomSection: CustomSection | null;
  activeLabel: string;
  isCustomSectionFile: boolean;
  markdownMode: MarkdownEditorMode;
  onOpenFile: (fileId: EditorFileId) => void;
  onCloseFile: (fileId: EditorFileId) => void;
  onUpdateCustomSection: (sectionKey: string, content: string) => void;
}

export function DocumentsEditorPane({
  activeDocument,
  activeFileId,
  openFileIds,
  activeCustomSection,
  activeLabel,
  isCustomSectionFile,
  markdownMode,
  onOpenFile,
  onCloseFile,
  onUpdateCustomSection,
}: DocumentsEditorPaneProps) {
  return (
    <main className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-9 shrink-0 items-center justify-between border-b bg-muted/20">
        <EditorTabStrip
          activeDocument={activeDocument}
          activeFileId={activeFileId}
          openFileIds={openFileIds}
          onOpenFile={onOpenFile}
          onCloseFile={onCloseFile}
        />
      </div>

      {activeCustomSection ? (
        <div className="min-h-0 flex-1">
          {markdownMode === 'code' ? (
            <CustomSectionCodeEditor
              section={activeCustomSection}
              documentId={activeDocument.id}
              onChange={(content) => onUpdateCustomSection(activeCustomSection.key, content)}
            />
          ) : (
            <CustomSectionEditor
              section={activeCustomSection}
              onChange={(content) => onUpdateCustomSection(activeCustomSection.key, content)}
            />
          )}
        </div>
      ) : null}

      <div className="flex h-6 shrink-0 items-center justify-between border-t bg-muted/30 px-3 font-mono text-[11px] text-muted-foreground">
        <span>{activeLabel}</span>
        <span>{isCustomSectionFile ? 'markdown' : 'readonly'}</span>
      </div>
    </main>
  );
}
