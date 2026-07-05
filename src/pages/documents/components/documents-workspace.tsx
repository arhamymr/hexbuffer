import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  type CustomSection,
  type ReconDocument,
} from '../types';
import { DocumentsEditorPane } from './documents-editor-pane';
import { DocumentsExplorer } from './documents-explorer';
import { type EditorFileId } from '../lib/editor-files';

interface DocumentsWorkspaceProps {
  activeDocument: ReconDocument;
  activeFileId: EditorFileId | null;
  openFileIds: EditorFileId[];
  activeCustomSection: CustomSection | null;
  activeLabel: string;
  isCustomSectionFile: boolean;
  onOpenFile: (fileId: EditorFileId) => void;
  onAddCustomSection: () => void;
  onRenameCustomSection: (section: CustomSection) => void;
  onRemoveCustomSection: (sectionKey: string) => void;
  onReorderCustomSections: (fromIndex: number, toIndex: number) => void;
  onCloseFile: (fileId: EditorFileId) => void;
  onUpdateCustomSection: (sectionKey: string, content: string) => void;
}

export function DocumentsWorkspace({
  activeDocument,
  activeFileId,
  openFileIds,
  activeCustomSection,
  activeLabel,
  isCustomSectionFile,
  onOpenFile,
  onAddCustomSection,
  onRenameCustomSection,
  onRemoveCustomSection,
  onReorderCustomSections,
  onCloseFile,
  onUpdateCustomSection,
}: DocumentsWorkspaceProps) {
  return (
    <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
      <ResizablePanel defaultSize={22} minSize={18}>
        <DocumentsExplorer
          activeDocument={activeDocument}
          activeFileId={activeFileId}
          onOpenFile={onOpenFile}
          onAddCustomSection={onAddCustomSection}
          onRenameCustomSection={onRenameCustomSection}
          onRemoveCustomSection={onRemoveCustomSection}
          onReorderCustomSections={onReorderCustomSections}
        />
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={78} minSize={35}>
        <DocumentsEditorPane
          activeDocument={activeDocument}
          activeFileId={activeFileId}
          openFileIds={openFileIds}
          activeCustomSection={activeCustomSection}
          activeLabel={activeLabel}
          isCustomSectionFile={isCustomSectionFile}
          onOpenFile={onOpenFile}
          onCloseFile={onCloseFile}
          onUpdateCustomSection={onUpdateCustomSection}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
