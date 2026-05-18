import * as React from 'react';
import { useDocumentsStore } from '@/stores/documents';
import { type DocumentSectionKey } from '../constants';
import { type ReconDocument } from '../types';

export function useDocumentsPage() {
  const {
    documents,
    activeDocumentId,
    setActiveDocumentId,
    addDocument,
    updateDocument,
    closeDocument,
  } = useDocumentsStore();

  const activeDocument = React.useMemo(
    () => documents.find((document) => document.id === activeDocumentId) ?? documents[0] ?? null,
    [activeDocumentId, documents]
  );

  const updateActiveDocument = React.useCallback(
    (updater: (document: ReconDocument) => ReconDocument) => {
      if (!activeDocumentId) {
        return;
      }

      updateDocument(activeDocumentId, updater);
    },
    [activeDocumentId, updateDocument]
  );

  const updateTitle = React.useCallback(
    (title: string) => {
      updateActiveDocument((document) => ({
        ...document,
        title,
        updatedAt: new Date().toISOString(),
      }));
    },
    [updateActiveDocument]
  );

  const updateSection = React.useCallback(
    (sectionKey: DocumentSectionKey, value: string) => {
      updateActiveDocument((document) => ({
        ...document,
        sections: {
          ...document.sections,
          [sectionKey]: value,
        },
        updatedAt: new Date().toISOString(),
      }));
    },
    [updateActiveDocument]
  );

  return {
    tabs: documents.map((document) => ({
      id: document.id,
      name: document.title.trim() || document.name,
    })),
    activeDocumentId,
    setActiveDocumentId,
    addDocument,
    closeDocument,
    activeDocument,
    updateTitle,
    updateSection,
  };
}
