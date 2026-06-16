'use client';

import * as React from 'react';
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
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { CustomSectionDialog } from './components/custom-section-dialog';
import { DocumentTemplateDialog } from './components/document-template-dialog';
import { DocumentsToolbar } from './components/documents-toolbar';
import { DocumentsWorkspace } from './components/documents-workspace';
import { useDocumentsPage } from './hooks/use-documents-page';
import { type MarkdownEditorMode } from './types';

export function DocumentsPage() {
  const [markdownMode, setMarkdownMode] = React.useState<MarkdownEditorMode>('code');
  const {
    tabs,
    activeDocumentId,
    setActiveDocumentId,
    addDocument,
    openTemplateDialog,
    isTemplateDialogOpen,
    setIsTemplateDialogOpen,
    closeDocument,
    activeDocument,
    renameDocument,
    updateTitle,
    removeCustomSection,
    reorderCustomSections,
    updateCustomSection,
    undoCustomSectionChange,
    redoCustomSectionChange,
    canUndoCustomSection,
    canRedoCustomSection,
    deleteApiEntry,
    addApiEntry,
    updateApiEntryRaw,
    apiEditError,
    apiResponse,
    isFetchingApi,
    apiFetchError,
    fetchSelectedApi,
    activeFileId,
    openFileIds,
    isApiFolderOpen,
    setIsApiFolderOpen,
    openFile,
    closeFile,
    openApiEntry,
    activeApiEntry,
    activeCustomSection,
    activeLabel,
    isCustomSectionFile,
    documentPendingDelete,
    documentIdPendingDelete,
    cancelDocumentDelete,
    confirmDocumentDelete,
    isCustomSectionDialogOpen,
    setIsCustomSectionDialogOpen,
    handleAddCustomSection,
    customSectionPendingRename,
    setCustomSectionPendingRename,
    handleRenameCustomSection,
    exporting,
    handleExportPdf,
  } = useDocumentsPage();

  if (!activeDocument) {
    return null;
  }

  return (
    <>
      <TabbedPageLayout
        tabs={tabs}
        activeTabId={activeDocumentId}
        onTabChange={setActiveDocumentId}
        onTabAdd={openTemplateDialog}
        onTabRename={renameDocument}
        onTabClose={closeDocument}
        className="flex min-h-0 h-full flex-1 flex-col"
        contentClassName="flex-1 rounded-lg border min-h-0 overflow-hidden bg-background"
      >
        <div className="flex h-full min-h-0 flex-col">
          <DocumentsToolbar
            activeDocument={activeDocument}
            exporting={exporting}
            canPreviewMarkdown={isCustomSectionFile}
            markdownMode={markdownMode}
            canUndoMarkdown={isCustomSectionFile && canUndoCustomSection}
            canRedoMarkdown={isCustomSectionFile && canRedoCustomSection}
            onExportPdf={handleExportPdf}
            onMarkdownModeChange={setMarkdownMode}
            onUndoMarkdown={undoCustomSectionChange}
            onRedoMarkdown={redoCustomSectionChange}
            onTitleChange={updateTitle}
          />
          <DocumentsWorkspace
            activeDocument={activeDocument}
            activeFileId={activeFileId}
            openFileIds={openFileIds}
            isApiFolderOpen={isApiFolderOpen}
            activeApiEntry={activeApiEntry}
            activeCustomSection={activeCustomSection}
            activeLabel={activeLabel}
            isCustomSectionFile={isCustomSectionFile}
            apiResponse={apiResponse}
            isFetchingApi={isFetchingApi}
            apiFetchError={apiFetchError}
            apiEditError={apiEditError}
            markdownMode={markdownMode}
            onApiFolderOpenChange={setIsApiFolderOpen}
            onOpenFile={openFile}
            onOpenApiEntry={openApiEntry}
            onAddApiEntry={addApiEntry}
            onDeleteApiEntry={deleteApiEntry}
            onAddCustomSection={() => setIsCustomSectionDialogOpen(true)}
            onRenameCustomSection={setCustomSectionPendingRename}
            onRemoveCustomSection={removeCustomSection}
            onReorderCustomSections={reorderCustomSections}
            onCloseFile={closeFile}
            onFetchSelectedApi={fetchSelectedApi}
            onUpdateCustomSection={updateCustomSection}
            onUpdateApiEntryRaw={updateApiEntryRaw}
          />
        </div>
      </TabbedPageLayout>

      <AlertDialog
        open={documentIdPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            cancelDocumentDelete();
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
              variant="destructive"
              onClick={confirmDocumentDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomSectionDialog
        open={isCustomSectionDialogOpen}
        onOpenChange={setIsCustomSectionDialogOpen}
        onAdd={handleAddCustomSection}
      />

      <CustomSectionDialog
        open={customSectionPendingRename !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCustomSectionPendingRename(null);
          }
        }}
        onAdd={handleRenameCustomSection}
        initialValues={customSectionPendingRename}
        mode="edit"
      />

      <DocumentTemplateDialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
        onSelectTemplate={addDocument}
      />
    </>
  );
}
