'use client';

import { TabbedPageLayout } from '@/pages/shared/tabbed-page-layout';
import { DOCUMENT_SECTION_DEFINITIONS } from './constants';
import { DocumentHeader } from './components/document-header';
import { DocumentSectionCard } from './components/document-section-card';
import { DocumentApiCollection } from './components/document-api-collection';
import { useDocumentsPage } from './hooks/use-documents-page';

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

  if (!activeDocument) {
    return null;
  }

  return (
    <TabbedPageLayout
      tabs={tabs}
      activeTabId={activeDocumentId}
      onTabChange={setActiveDocumentId}
      onTabRename={renameDocument}
      onTabClose={closeDocument}
      contentClassName="flex-1 border rounded-lg overflow-hidden bg-background min-h-0"
    >
      <div className="flex h-full flex-col">
        <DocumentHeader
          title={activeDocument.title}
          onTitleChange={updateTitle}
          onAddDocument={addDocument}
        />
        <div className="flex-1 overflow-auto p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <DocumentApiCollection
              entries={activeDocument.apiEntries}
              selectedEntryId={selectedApiEntryId}
              response={apiResponse}
              isLoading={isFetchingApi}
              error={apiFetchError}
              onSelectEntry={selectApiEntry}
              onFetchEntry={fetchSelectedApi}
            />
            {DOCUMENT_SECTION_DEFINITIONS.map((section) => (
              <DocumentSectionCard
                key={section.key}
                sectionKey={section.key}
                title={section.title}
                description={section.description}
                placeholder={section.placeholder}
                value={activeDocument.sections[section.key]}
                onChange={updateSection}
              />
            ))}
          </div>
        </div>
      </div>
    </TabbedPageLayout>
  );
}
