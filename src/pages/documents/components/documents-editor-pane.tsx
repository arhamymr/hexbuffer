import { Loader2, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type ReconDocument, type CustomSection, type SavedApiEntry } from '../types';
import { type RepeaterResponse } from '@/pages/repeater/types';
import { ApiEntryEditor } from './api-entry-editor';
import { ApiFolderEditor } from './api-folder-editor';
import { CustomSectionEditor } from './custom-section-editor';
import { EditorTabStrip } from './editor-tab-strip';
import { MarkdownPreview } from './markdown-preview';
import { type EditorFileId } from '../lib/editor-files';

interface DocumentsEditorPaneProps {
  activeDocument: ReconDocument;
  activeFileId: EditorFileId;
  openFileIds: EditorFileId[];
  activeApiEntry: SavedApiEntry | null;
  activeCustomSection: CustomSection | null;
  activeLabel: string;
  isCustomSectionFile: boolean;
  apiResponse: RepeaterResponse | null;
  isFetchingApi: boolean;
  apiFetchError: string | null;
  apiEditError: string | null;
  markdownMode: 'edit' | 'preview';
  onOpenFile: (fileId: EditorFileId) => void;
  onCloseFile: (fileId: EditorFileId) => void;
  onFetchSelectedApi: () => void;
  onUpdateCustomSection: (sectionKey: string, content: string) => void;
  onUpdateApiEntryRaw: (entryId: string, rawRequest: string) => void;
}

export function DocumentsEditorPane({
  activeDocument,
  activeFileId,
  openFileIds,
  activeApiEntry,
  activeCustomSection,
  activeLabel,
  isCustomSectionFile,
  apiResponse,
  isFetchingApi,
  apiFetchError,
  apiEditError,
  markdownMode,
  onOpenFile,
  onCloseFile,
  onFetchSelectedApi,
  onUpdateCustomSection,
  onUpdateApiEntryRaw,
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

        {activeFileId.startsWith('api:') && activeApiEntry && (
          <div className="flex min-w-0 items-center gap-2 px-3">
            <Badge variant="secondary">{activeApiEntry.method}</Badge>
            {activeApiEntry.responseStatus !== null && (
              <Badge variant="outline">{activeApiEntry.responseStatus}</Badge>
            )}
            <Button
              size="xs"
              type="button"
              onClick={onFetchSelectedApi}
              disabled={isFetchingApi}
            >
              {isFetchingApi ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Fetch
            </Button>
          </div>
        )}
      </div>

      {activeCustomSection ? (
        <div className="min-h-0 flex-1">
          {markdownMode === 'preview' ? (
            <MarkdownPreview section={activeCustomSection} />
          ) : (
            <CustomSectionEditor
              section={activeCustomSection}
              onChange={(content) => onUpdateCustomSection(activeCustomSection.key, content)}
            />
          )}
        </div>
      ) : activeFileId === 'api' ? (
        <div className="min-h-0 flex-1">
          <ApiFolderEditor document={activeDocument} />
        </div>
      ) : activeApiEntry ? (
        <ApiEntryEditor
          document={activeDocument}
          entry={activeApiEntry}
          response={apiResponse}
          isLoading={isFetchingApi}
          error={apiFetchError}
          editError={apiEditError}
          onChangeRawRequest={onUpdateApiEntryRaw}
        />
      ) : null}

      <div className="flex h-6 shrink-0 items-center justify-between border-t bg-muted/30 px-3 font-mono text-[11px] text-muted-foreground">
        <span>{activeLabel}</span>
        <span>{isCustomSectionFile ? 'markdown' : activeFileId.startsWith('api:') ? 'http' : 'readonly'}</span>
      </div>
    </main>
  );
}
