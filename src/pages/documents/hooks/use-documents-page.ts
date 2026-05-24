import * as React from 'react';
import { useDocumentsStore } from '@/stores/documents';
import { sendRepeaterRequest } from '@/pages/repeater/api';
import { type DocumentSectionKey } from '../constants';
import { type ReconDocument, type CustomSection } from '../types';
import { type RepeaterResponse } from '@/pages/repeater/types';

export function useDocumentsPage() {
  const {
    documents,
    activeDocumentId,
    setActiveDocumentId,
    addDocument,
    loadFromDb,
    updateDocument,
    closeDocument,
  } = useDocumentsStore();

  React.useEffect(() => {
    void loadFromDb().catch((error) => {
      console.error('Failed to load documents from database:', error);
    });
  }, [loadFromDb]);

  const activeDocument = React.useMemo(
    () => documents.find((document) => document.id === activeDocumentId) ?? documents[0] ?? null,
    [activeDocumentId, documents]
  );
  const [selectedApiEntryId, setSelectedApiEntryId] = React.useState<string | null>(null);
  const [apiResponse, setApiResponse] = React.useState<RepeaterResponse | null>(null);
  const [isFetchingApi, setIsFetchingApi] = React.useState(false);
  const [apiFetchError, setApiFetchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const firstEntryId = activeDocument?.apiEntries[0]?.id ?? null;
    const selectedEntryStillExists = activeDocument?.apiEntries.some(
      (entry) => entry.id === selectedApiEntryId
    );

    if (!selectedEntryStillExists) {
      setSelectedApiEntryId(firstEntryId);
      setApiResponse(null);
      setApiFetchError(null);
    }
  }, [activeDocument, selectedApiEntryId]);

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

  const renameDocument = React.useCallback(
    (documentId: string, title: string) => {
      updateDocument(documentId, (document) => ({
        ...document,
        title,
        updatedAt: new Date().toISOString(),
      }));
    },
    [updateDocument]
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

  const addCustomSection = React.useCallback(
    (title: string, description: string, placeholder: string) => {
      if (!activeDocumentId) return;
      useDocumentsStore.getState().addCustomSection(activeDocumentId, {
        title,
        description,
        placeholder,
        content: '',
      });
    },
    [activeDocumentId]
  );

  const removeCustomSection = React.useCallback(
    (sectionKey: string) => {
      if (!activeDocumentId) return;
      useDocumentsStore.getState().removeCustomSection(activeDocumentId, sectionKey);
    },
    [activeDocumentId]
  );

  const removeBuiltInSection = React.useCallback(
    (sectionKey: DocumentSectionKey) => {
      if (!activeDocumentId) return;
      useDocumentsStore.getState().removeBuiltInSection(activeDocumentId, sectionKey);
    },
    [activeDocumentId]
  );

  const restoreBuiltInSection = React.useCallback(
    (sectionKey: DocumentSectionKey) => {
      if (!activeDocumentId) return;
      useDocumentsStore.getState().restoreBuiltInSection(activeDocumentId, sectionKey);
    },
    [activeDocumentId]
  );

  const updateCustomSection = React.useCallback(
    (sectionKey: string, content: string) => {
      updateActiveDocument((document) => ({
        ...document,
        customSections: document.customSections.map((s) =>
          s.key === sectionKey ? { ...s, content } : s
        ),
        updatedAt: new Date().toISOString(),
      }));
    },
    [updateActiveDocument]
  );

  const deleteApiEntry = React.useCallback(
    (entryId: string) => {
      if (!activeDocumentId) return;
      useDocumentsStore.getState().removeApiEntryFromDocument(activeDocumentId, entryId);
    },
    [activeDocumentId]
  );

  const fetchSelectedApi = React.useCallback(async () => {
    const selectedEntry =
      activeDocument?.apiEntries.find((entry) => entry.id === selectedApiEntryId) ??
      activeDocument?.apiEntries[0];

    if (!selectedEntry) {
      return;
    }

    setIsFetchingApi(true);
    setApiFetchError(null);

    try {
      const response = await sendRepeaterRequest({
        method: selectedEntry.method,
        url: selectedEntry.url,
        headers: selectedEntry.headers,
        body: selectedEntry.requestBody ?? '',
      });
      setApiResponse(response);
    } catch (error) {
      setApiResponse(null);
      setApiFetchError(
        error instanceof Error
          ? error.message
          : typeof error === 'string'
          ? error
          : 'Failed to send request.'
      );
    } finally {
      setIsFetchingApi(false);
    }
  }, [activeDocument, selectedApiEntryId]);

  const selectApiEntry = React.useCallback((entryId: string) => {
    setSelectedApiEntryId(entryId);
    setApiResponse(null);
    setApiFetchError(null);
  }, []);

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
    renameDocument,
    updateTitle,
    updateSection,
    addCustomSection,
    removeCustomSection,
    updateCustomSection,
    removeBuiltInSection,
    restoreBuiltInSection,
    deleteApiEntry,
    selectedApiEntryId,
    apiResponse,
    isFetchingApi,
    apiFetchError,
    selectApiEntry,
    fetchSelectedApi,
  };
}
