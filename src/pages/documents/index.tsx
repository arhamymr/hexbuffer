'use client';

import * as React from 'react';
import { FilePlus2, Loader2, Play } from 'lucide-react';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ApiEntryEditor } from './components/api-entry-editor';
import { ApiFolderEditor } from './components/api-folder-editor';
import { DocumentMarkdownEditor } from './components/document-markdown-editor';
import { DocumentsExplorer } from './components/documents-explorer';
import { EditorTabStrip } from './components/editor-tab-strip';
import { useDocumentsPage } from './hooks/use-documents-page';
import {
  getFileLabel,
  getFileName,
  getSectionDefinition,
  isDocumentSectionFile,
  type EditorFileId,
} from './lib/editor-files';

export function DocumentsPage() {
  const {
    tabs,
    activeDocumentId,
    setActiveDocumentId,
    addDocument,
    closeDocument,
    activeDocument,
    renameDocument,
    updateTitle,
    updateSection,
    selectedApiEntryId,
    apiResponse,
    isFetchingApi,
    apiFetchError,
    selectApiEntry,
    fetchSelectedApi,
  } = useDocumentsPage();
  const [activeFileId, setActiveFileId] = React.useState<EditorFileId>('scope');
  const [openFileIds, setOpenFileIds] = React.useState<EditorFileId[]>(['scope']);
  const [isApiFolderOpen, setIsApiFolderOpen] = React.useState(true);
  const [documentIdPendingDelete, setDocumentIdPendingDelete] = React.useState<string | null>(
    null
  );

  if (!activeDocument) {
    return null;
  }

  const documentPendingDelete =
    tabs.find((tab) => tab.id === documentIdPendingDelete) ?? null;
  const selectedApiEntry =
    activeDocument.apiEntries.find((entry) => entry.id === selectedApiEntryId) ??
    activeDocument.apiEntries[0] ??
    null;
  const activeApiEntry =
    activeFileId.startsWith('api:')
      ? activeDocument.apiEntries.find((entry) => activeFileId === `api:${entry.id}`) ?? null
      : selectedApiEntry;
  const isSectionFile = isDocumentSectionFile(activeFileId);
  const activeSection = isSectionFile ? getSectionDefinition(activeFileId) : null;
  const activeLabel = getFileLabel(activeFileId, activeApiEntry);
  const activeFileName = getFileName(activeFileId, activeApiEntry);

  const openFile = (fileId: EditorFileId) => {
    setActiveFileId(fileId);
    setOpenFileIds((fileIds) =>
      fileIds.includes(fileId) ? fileIds : [...fileIds, fileId]
    );
  };

  const closeFile = (fileId: EditorFileId) => {
    const nextFileIds = openFileIds.filter((openFileId) => openFileId !== fileId);
    const fallbackFileId = nextFileIds[nextFileIds.length - 1] ?? 'scope';

    setOpenFileIds(nextFileIds.length ? nextFileIds : ['scope']);

    if (activeFileId === fileId) {
      setActiveFileId(fallbackFileId);
    }
  };

  const openApiEntry = (entryId: string) => {
    selectApiEntry(entryId);
    openFile(`api:${entryId}`);
  };

  const requestDocumentDelete = (documentId: string) => {
    setDocumentIdPendingDelete(documentId);
  };

  const confirmDocumentDelete = () => {
    if (!documentIdPendingDelete) {
      return;
    }

    closeDocument(documentIdPendingDelete);
    setDocumentIdPendingDelete(null);
    setActiveFileId('scope');
    setOpenFileIds(['scope']);
  };

  return (
    <>
      <TabbedPageLayout
        tabs={tabs}
        activeTabId={activeDocumentId}
        onTabChange={setActiveDocumentId}
        onTabRename={renameDocument}
        onTabClose={requestDocumentDelete}
        className="flex h-full min-h-0 flex-col"
        contentClassName="flex-1 flex flex-col overflow-hidden bg-background min-h-0"
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex h-9 shrink-0 items-center gap-2 border-b bg-background px-2">
            <Input
              value={activeDocument.title}
              onChange={(event) => updateTitle(event.target.value)}
              placeholder="Untitled recon document"
              className="h-7 max-w-72 border-transparent bg-transparent px-2 text-xs font-medium shadow-none hover:border-input focus-visible:border-ring"
            />
            <div className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
              documents / {activeFileName}
            </div>
            <Button
              size="icon-sm"
              type="button"
              variant="ghost"
              aria-label="New document"
              title="New document"
              onClick={() => {
                addDocument();
                openFile('scope');
              }}
            >
              <FilePlus2 className="h-4 w-4" />
            </Button>
          </div>

        <Card className="mt-3 flex flex-1 flex-col overflow-hidden !py-0">
          <ResizablePanelGroup orientation="horizontal" className="flex-1">
            <ResizablePanel defaultSize={20} minSize={20}>
              <DocumentsExplorer
                activeDocument={activeDocument}
                activeFileId={activeFileId}
                isApiFolderOpen={isApiFolderOpen}
                onApiFolderOpenChange={setIsApiFolderOpen}
                onOpenFile={openFile}
                onOpenApiEntry={openApiEntry}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={80}>
              <main className="flex h-full min-h-0 flex-col bg-background">
                <div className="flex h-9 shrink-0 items-center justify-between border-b bg-muted/20">
                  <EditorTabStrip
                    activeDocument={activeDocument}
                    activeFileId={activeFileId}
                    openFileIds={openFileIds}
                    onOpenFile={openFile}
                    onCloseFile={closeFile}
                  />

                  {activeFileId.startsWith('api:') && activeApiEntry && (
                    <div className="flex min-w-0 items-center gap-2 px-3">
                      <Badge variant="secondary">{activeApiEntry.method}</Badge>
                      {activeApiEntry.responseStatus !== null && (
                        <Badge variant="outline">{activeApiEntry.responseStatus}</Badge>
                      )}
                      <Button size="xs" type="button" onClick={fetchSelectedApi} disabled={isFetchingApi}>
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

                {activeSection ? (
                  <div className="min-h-0 flex-1">
                    <DocumentMarkdownEditor
                      document={activeDocument}
                      sectionKey={activeSection.key}
                      onChange={updateSection}
                    />
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
                  />
                ) : null}

                <div className="flex h-6 shrink-0 items-center justify-between border-t bg-muted/30 px-3 font-mono text-[11px] text-muted-foreground">
                  <span>{activeLabel}</span>
                  <span>{isSectionFile ? 'markdown' : 'readonly'}</span>
                </div>
              </main>
            </ResizablePanel>
          </ResizablePanelGroup>
        </Card>
        </div>
      </TabbedPageLayout>

      <AlertDialog
        open={documentIdPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDocumentIdPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {documentPendingDelete?.name ?? 'this document'} and its saved notes
              from Documents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDocumentDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
