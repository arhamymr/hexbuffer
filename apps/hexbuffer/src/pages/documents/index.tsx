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

export function DocumentsPage() {
  const page = useDocumentsPage();

  if (!page.activeDocument) {
    return null;
  }

  return (
    <>
      <TabbedPageLayout
        tabs={page.tabs}
        activeTabId={page.activeDocumentId}
        onTabChange={page.setActiveDocumentId}
        onTabAdd={page.openTemplateDialog}
        onTabRename={page.renameDocument}
        onTabClose={page.closeDocument}
        className="flex min-h-0 h-full flex-1 flex-col"
        contentClassName="flex-1 rounded-lg border min-h-0 overflow-hidden bg-background"
      >
        <div className="flex h-full min-h-0 flex-col">
          <DocumentsToolbar
            activeDocument={page.activeDocument}
            exporting={page.exporting}
            canPreviewMarkdown={page.isCustomSectionFile}
            markdownMode={page.markdownMode}
            canUndoMarkdown={page.isCustomSectionFile && page.canUndoCustomSection}
            canRedoMarkdown={page.isCustomSectionFile && page.canRedoCustomSection}
            onExportPdf={page.handleExportPdf}
            onMarkdownModeChange={page.setMarkdownMode}
            onUndoMarkdown={page.undoCustomSectionChange}
            onRedoMarkdown={page.redoCustomSectionChange}
            onTitleChange={page.updateTitle}
          />
          <DocumentsWorkspace
            activeDocument={page.activeDocument}
            activeFileId={page.activeFileId}
            openFileIds={page.openFileIds}
            isApiFolderOpen={page.isApiFolderOpen}
            activeApiEntry={page.activeApiEntry}
            activeCustomSection={page.activeCustomSection}
            activeLabel={page.activeLabel}
            isCustomSectionFile={page.isCustomSectionFile}
            apiResponse={page.apiResponse}
            isFetchingApi={page.isFetchingApi}
            apiFetchError={page.apiFetchError}
            apiEditError={page.apiEditError}
            markdownMode={page.markdownMode}
            onApiFolderOpenChange={page.setIsApiFolderOpen}
            onOpenFile={page.openFile}
            onOpenApiEntry={page.openApiEntry}
            onAddApiEntry={page.addApiEntry}
            onDeleteApiEntry={page.deleteApiEntry}
            onAddCustomSection={() => page.setIsCustomSectionDialogOpen(true)}
            onRenameCustomSection={page.setCustomSectionPendingRename}
            onRemoveCustomSection={page.removeCustomSection}
            onReorderCustomSections={page.reorderCustomSections}
            onCloseFile={page.closeFile}
            onFetchSelectedApi={page.fetchSelectedApi}
            onUpdateCustomSection={page.updateCustomSection}
            onUpdateApiEntryRaw={page.updateApiEntryRaw}
          />
        </div>
      </TabbedPageLayout>

      <AlertDialog
        open={page.documentIdPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) page.cancelDocumentDelete();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {page.documentPendingDelete?.name ?? 'this document'} and its saved notes
              from Documents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={page.confirmDocumentDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomSectionDialog
        open={page.isCustomSectionDialogOpen}
        onOpenChange={page.setIsCustomSectionDialogOpen}
        onAdd={page.handleAddCustomSection}
      />

      <CustomSectionDialog
        open={page.customSectionPendingRename !== null}
        onOpenChange={(open) => {
          if (!open) page.setCustomSectionPendingRename(null);
        }}
        onAdd={page.handleRenameCustomSection}
        initialValues={page.customSectionPendingRename}
        mode="edit"
      />

      <DocumentTemplateDialog
        open={page.isTemplateDialogOpen}
        onOpenChange={page.setIsTemplateDialogOpen}
        onSelectTemplate={page.addDocument}
      />
    </>
  );
}

