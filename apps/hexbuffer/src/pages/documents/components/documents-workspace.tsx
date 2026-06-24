import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  type CustomSection,
  type MarkdownEditorMode,
  type ReconDocument,
  type SavedApiEntry,
} from '../types';
import { type RepeaterResponse } from '@/pages/repeater/types';
import { DocumentsEditorPane } from './documents-editor-pane';
import { DocumentsExplorer } from './documents-explorer';
import { type EditorFileId } from '../lib/editor-files';

interface DocumentsWorkspaceProps {
  activeDocument: ReconDocument;
  activeFileId: EditorFileId;
  openFileIds: EditorFileId[];
  isApiFolderOpen: boolean;
  activeApiEntry: SavedApiEntry | null;
  activeCustomSection: CustomSection | null;
  activeLabel: string;
  isCustomSectionFile: boolean;
  apiResponse: RepeaterResponse | null;
  isFetchingApi: boolean;
  apiFetchError: string | null;
  apiEditError: string | null;
  markdownMode: MarkdownEditorMode;
  onApiFolderOpenChange: (isOpen: boolean) => void;
  onOpenFile: (fileId: EditorFileId) => void;
  onOpenApiEntry: (entryId: string) => void;
  onAddApiEntry: () => void;
  onDeleteApiEntry: (entryId: string) => void;
  onAddCustomSection: () => void;
  onRenameCustomSection: (section: CustomSection) => void;
  onRemoveCustomSection: (sectionKey: string) => void;
  onReorderCustomSections: (fromIndex: number, toIndex: number) => void;
  onCloseFile: (fileId: EditorFileId) => void;
  onFetchSelectedApi: () => void;
  onUpdateCustomSection: (sectionKey: string, content: string) => void;
  onUpdateApiEntryRaw: (entryId: string, rawRequest: string) => void;
}

export function DocumentsWorkspace({
  activeDocument,
  activeFileId,
  openFileIds,
  isApiFolderOpen,
  activeApiEntry,
  activeCustomSection,
  activeLabel,
  isCustomSectionFile,
  apiResponse,
  isFetchingApi,
  apiFetchError,
  apiEditError,
  markdownMode,
  onApiFolderOpenChange,
  onOpenFile,
  onOpenApiEntry,
  onAddApiEntry,
  onDeleteApiEntry,
  onAddCustomSection,
  onRenameCustomSection,
  onRemoveCustomSection,
  onReorderCustomSections,
  onCloseFile,
  onFetchSelectedApi,
  onUpdateCustomSection,
  onUpdateApiEntryRaw,
}: DocumentsWorkspaceProps) {
  return (
    <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
      <ResizablePanel defaultSize={22} minSize={18}>
        <DocumentsExplorer
          activeDocument={activeDocument}
          activeFileId={activeFileId}
          isApiFolderOpen={isApiFolderOpen}
          onApiFolderOpenChange={onApiFolderOpenChange}
          onOpenFile={onOpenFile}
          onOpenApiEntry={onOpenApiEntry}
          onAddApiEntry={onAddApiEntry}
          onDeleteApiEntry={onDeleteApiEntry}
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
          activeApiEntry={activeApiEntry}
          activeCustomSection={activeCustomSection}
          activeLabel={activeLabel}
          isCustomSectionFile={isCustomSectionFile}
          apiResponse={apiResponse}
          isFetchingApi={isFetchingApi}
          apiFetchError={apiFetchError}
          apiEditError={apiEditError}
          markdownMode={markdownMode}
          onOpenFile={onOpenFile}
          onCloseFile={onCloseFile}
          onFetchSelectedApi={onFetchSelectedApi}
          onUpdateCustomSection={onUpdateCustomSection}
          onUpdateApiEntryRaw={onUpdateApiEntryRaw}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
