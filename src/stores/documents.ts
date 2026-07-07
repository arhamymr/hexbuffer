import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  deleteDocumentFromDb,
  loadDocumentsFromDb,
  saveDocumentToDb,
} from '@/pages/markdown/api';
import {
  createDocument,
  createEmptySections,
  type ReconDocument,
  type SavedApiEntry,
  type CustomSection,
} from '@/pages/markdown/types';
import {
  DOCUMENT_SECTION_DEFINITIONS,
  type DocumentSectionKey,
  type DocumentTemplateId,
} from '@/pages/markdown/constants';

interface DocumentsState {
  documents: ReconDocument[];
  activeDocumentId: string;
  setActiveDocumentId: (id: string) => void;
  addDocument: (templateId?: DocumentTemplateId) => string;
  loadFromDb: () => Promise<void>;
  updateDocument: (id: string, updater: (document: ReconDocument) => ReconDocument) => void;
  addApiEntryToActiveDocument: (entry: Omit<SavedApiEntry, 'id' | 'savedAt'>) => void;
  addApiEntryToDocument: (documentId: string, entry: Omit<SavedApiEntry, 'id' | 'savedAt'>) => string;
  updateApiEntry: (
    documentId: string,
    entryId: string,
    updater: (entry: SavedApiEntry) => SavedApiEntry
  ) => void;
  removeApiEntryFromDocument: (documentId: string, entryId: string) => void;
  addCustomSection: (documentId: string, section: Omit<CustomSection, 'key'>) => string;
  renameCustomSection: (
    documentId: string,
    sectionKey: string,
    metadata: Pick<CustomSection, 'title' | 'description' | 'placeholder'>
  ) => void;
  removeCustomSection: (documentId: string, sectionKey: string) => void;
  reorderCustomSections: (documentId: string, fromIndex: number, toIndex: number) => void;
  clearBuiltInSection: (documentId: string, sectionKey: DocumentSectionKey) => void;
  removeBuiltInSection: (documentId: string, sectionKey: DocumentSectionKey) => void;
  restoreBuiltInSection: (documentId: string, sectionKey: DocumentSectionKey) => void;
  closeDocument: (id: string) => void;
}

const initialDocument = createDocument(1);

function getNextDocumentIndex(documents: ReconDocument[]) {
  const highestIndex = documents.reduce((maxIndex, document) => {
    const match = /^Document (\d+)$/.exec(document.name);
    const documentIndex = match ? Number(match[1]) : 0;

    return Math.max(maxIndex, documentIndex);
  }, 0);

  return highestIndex + 1;
}

function normalizeDocument(document: ReconDocument): ReconDocument {
  const existingCustomSections = document.customSections ?? [];
  const existingCustomSectionKeys = new Set(existingCustomSections.map((section) => section.key));
  const migratedBuiltInSections = DOCUMENT_SECTION_DEFINITIONS.flatMap((section) => {
    const content = document.sections?.[section.key]?.trim() ? document.sections[section.key] : '';

    if (!content || existingCustomSectionKeys.has(`builtin-${section.key}`)) {
      return [];
    }

    return [
      {
        key: `builtin-${section.key}`,
        title: section.title,
        description: section.description,
        placeholder: section.placeholder,
        content,
      },
    ];
  });

  return {
    ...document,
    sections: createEmptySections(),
    removedBuiltInSections: [],
    customSections: [...migratedBuiltInSections, ...existingCustomSections],
    apiEntries: document.apiEntries ?? [],
  };
}

function saveDocument(document: ReconDocument) {
  void saveDocumentToDb(document).catch((error) => {
    console.error('Failed to save document to database:', error);
  });
}

function deleteDocument(id: string) {
  void deleteDocumentFromDb(id).catch((error) => {
    console.error('Failed to delete document from database:', error);
  });
}

export const useDocumentsStore = create<DocumentsState>()(
  persist(
    (set) => ({
      documents: [initialDocument],
      activeDocumentId: initialDocument.id,
      setActiveDocumentId: (id) => set({ activeDocumentId: id }),
      addDocument: (templateId = 'blank') => {
        let createdDocumentId = '';

        set((state) => {
          const newDocument = createDocument(getNextDocumentIndex(state.documents), templateId);
          createdDocumentId = newDocument.id;
          saveDocument(newDocument);

          return {
            documents: [...state.documents, newDocument],
            activeDocumentId: newDocument.id,
          };
        });

        return createdDocumentId;
      },
      loadFromDb: async () => {
        const documents = await loadDocumentsFromDb();

        if (!documents?.length) {
          useDocumentsStore.getState().documents.forEach(saveDocument);
          return;
        }

        const normalizedDocuments = documents.map(normalizeDocument);
        set((state) => ({
          documents: normalizedDocuments,
          activeDocumentId: normalizedDocuments.some(
            (document) => document.id === state.activeDocumentId
          )
            ? state.activeDocumentId
            : normalizedDocuments[0].id,
        }));
      },
      updateDocument: (id, updater) =>
        set((state) => {
          let updatedDocument: ReconDocument | undefined;
          const documents = state.documents.map((document) => {
            if (document.id !== id) {
              return document;
            }

            updatedDocument = updater(document);
            return updatedDocument;
          });

          if (updatedDocument) {
            saveDocument(updatedDocument);
          }

          return { documents };
        }),
      addApiEntryToActiveDocument: (entry) =>
        set((state) => {
          let updatedDocument: ReconDocument | undefined;
          const documents = state.documents.map((document) => {
            if (document.id !== state.activeDocumentId) {
              return document;
            }

            const savedAt = new Date().toISOString();
            const nextEntry: SavedApiEntry = {
              ...entry,
              id: crypto.randomUUID(),
              savedAt,
            };

            const existingIndex = document.apiEntries.findIndex(
              (apiEntry) =>
                apiEntry.sourceHistoryId === entry.sourceHistoryId ||
                (apiEntry.method === entry.method && apiEntry.url === entry.url)
            );
            const apiEntries =
              existingIndex === -1
                ? [nextEntry, ...document.apiEntries]
                : document.apiEntries.map((apiEntry, index) =>
                  index === existingIndex ? { ...nextEntry, id: apiEntry.id } : apiEntry
                );

            updatedDocument = {
              ...document,
              apiEntries,
              updatedAt: savedAt,
            };

            return updatedDocument;
          });

          if (updatedDocument) {
            saveDocument(updatedDocument);
          }

          return { documents };
        }),
      addApiEntryToDocument: (documentId, entry) => {
        let createdEntryId = '';

        set((state) => {
          let updatedDocument: ReconDocument | undefined;
          const documents = state.documents.map((document) => {
            if (document.id !== documentId) {
              return document;
            }

            const savedAt = new Date().toISOString();
            const nextEntry: SavedApiEntry = {
              ...entry,
              id: crypto.randomUUID(),
              savedAt,
            };
            createdEntryId = nextEntry.id;
            updatedDocument = {
              ...document,
              apiEntries: [nextEntry, ...document.apiEntries],
              updatedAt: savedAt,
            };

            return updatedDocument;
          });

          if (updatedDocument) {
            saveDocument(updatedDocument);
          }

          return { documents };
        });

        return createdEntryId;
      },
      updateApiEntry: (documentId, entryId, updater) =>
        set((state) => {
          let updatedDocument: ReconDocument | undefined;
          const documents = state.documents.map((document) => {
            if (document.id !== documentId) {
              return document;
            }

            const updatedAt = new Date().toISOString();
            updatedDocument = {
              ...document,
              apiEntries: document.apiEntries.map((entry) =>
                entry.id === entryId ? updater({ ...entry, savedAt: updatedAt }) : entry
              ),
              updatedAt,
            };

            return updatedDocument;
          });

          if (updatedDocument) {
            saveDocument(updatedDocument);
          }

          return { documents };
        }),
      removeApiEntryFromDocument: (documentId, entryId) =>
        set((state) => {
          let updatedDocument: ReconDocument | undefined;
          const documents = state.documents.map((document) => {
            if (document.id !== documentId) {
              return document;
            }

            updatedDocument = {
              ...document,
              apiEntries: document.apiEntries.filter((entry) => entry.id !== entryId),
              updatedAt: new Date().toISOString(),
            };

            return updatedDocument;
          });

          if (updatedDocument) {
            saveDocument(updatedDocument);
          }

          return { documents };
        }),
      addCustomSection: (documentId, section) => {
        let createdSectionKey = '';

        set((state) => {
          let updatedDocument: ReconDocument | undefined;
          const documents = state.documents.map((document) => {
            if (document.id !== documentId) {
              return document;
            }

            const key = `custom-${Date.now()}`;
            createdSectionKey = key;
            updatedDocument = {
              ...document,
              customSections: [...document.customSections, { ...section, key }],
              updatedAt: new Date().toISOString(),
            };

            return updatedDocument;
          });

          if (updatedDocument) {
            saveDocument(updatedDocument);
          }

          return { documents };
        });

        return createdSectionKey;
      },
      renameCustomSection: (documentId, sectionKey, metadata) =>
        set((state) => {
          let updatedDocument: ReconDocument | undefined;
          const documents = state.documents.map((document) => {
            if (document.id !== documentId) {
              return document;
            }

            updatedDocument = {
              ...document,
              customSections: document.customSections.map((section) =>
                section.key === sectionKey ? { ...section, ...metadata } : section
              ),
              updatedAt: new Date().toISOString(),
            };

            return updatedDocument;
          });

          if (updatedDocument) {
            saveDocument(updatedDocument);
          }

          return { documents };
        }),
      removeCustomSection: (documentId, sectionKey) =>
        set((state) => {
          let updatedDocument: ReconDocument | undefined;
          const documents = state.documents.map((document) => {
            if (document.id !== documentId) {
              return document;
            }

            updatedDocument = {
              ...document,
              customSections: document.customSections.filter((s) => s.key !== sectionKey),
              updatedAt: new Date().toISOString(),
            };

            return updatedDocument;
          });

          if (updatedDocument) {
            saveDocument(updatedDocument);
          }

          return { documents };
        }),
      reorderCustomSections: (documentId, fromIndex, toIndex) =>
        set((state) => {
          let updatedDocument: ReconDocument | undefined;
          const documents = state.documents.map((document) => {
            if (document.id !== documentId) {
              return document;
            }

            const sections = [...document.customSections];
            const [moved] = sections.splice(fromIndex, 1);
            sections.splice(toIndex, 0, moved);

            updatedDocument = {
              ...document,
              customSections: sections,
              updatedAt: new Date().toISOString(),
            };

            return updatedDocument;
          });

          if (updatedDocument) {
            saveDocument(updatedDocument);
          }

          return { documents };
        }),
      clearBuiltInSection: (documentId, sectionKey) =>
        set((state) => {
          let updatedDocument: ReconDocument | undefined;
          const documents = state.documents.map((document) => {
            if (document.id !== documentId) {
              return document;
            }

            updatedDocument = {
              ...document,
              sections: {
                ...document.sections,
                [sectionKey]: '',
              },
              updatedAt: new Date().toISOString(),
            };

            return updatedDocument;
          });

          if (updatedDocument) {
            saveDocument(updatedDocument);
          }

          return { documents };
        }),
      removeBuiltInSection: (documentId, sectionKey) =>
        set((state) => {
          let updatedDocument: ReconDocument | undefined;
          const documents = state.documents.map((document) => {
            if (document.id !== documentId) {
              return document;
            }

            if (document.removedBuiltInSections.includes(sectionKey)) {
              return document;
            }

            updatedDocument = {
              ...document,
              removedBuiltInSections: [...document.removedBuiltInSections, sectionKey],
              updatedAt: new Date().toISOString(),
            };

            return updatedDocument;
          });

          if (updatedDocument) {
            saveDocument(updatedDocument);
          }

          return { documents };
        }),
      restoreBuiltInSection: (documentId, sectionKey) =>
        set((state) => {
          let updatedDocument: ReconDocument | undefined;
          const documents = state.documents.map((document) => {
            if (document.id !== documentId) {
              return document;
            }

            updatedDocument = {
              ...document,
              removedBuiltInSections: document.removedBuiltInSections.filter((k) => k !== sectionKey),
              updatedAt: new Date().toISOString(),
            };

            return updatedDocument;
          });

          if (updatedDocument) {
            saveDocument(updatedDocument);
          }

          return { documents };
        }),
      closeDocument: (id) =>
        set((state) => {
          const remainingDocuments = state.documents.filter((document) => document.id !== id);
          deleteDocument(id);

          if (remainingDocuments.length === 0) {
            const replacementDocument = createDocument(1);
            saveDocument(replacementDocument);
            return {
              documents: [replacementDocument],
              activeDocumentId: replacementDocument.id,
            };
          }

          if (state.activeDocumentId !== id) {
            return { documents: remainingDocuments };
          }

          const closedDocumentIndex = state.documents.findIndex((document) => document.id === id);
          const nextActiveDocument =
            remainingDocuments[Math.max(0, closedDocumentIndex - 1)] ?? remainingDocuments[0];

          return {
            documents: remainingDocuments,
            activeDocumentId: nextActiveDocument.id,
          };
        }),
    }),
    {
      name: 'hexbuffer-documents',
      partialize: (state) => ({
        documents: state.documents,
        activeDocumentId: state.activeDocumentId,
      }),
      merge: (persistedState, currentState) => {
        const typedState = persistedState as Partial<DocumentsState> | undefined;
        const persistedDocuments = typedState?.documents?.length
          ? typedState.documents.map(normalizeDocument)
          : currentState.documents;
        const persistedActiveDocumentId = typedState?.activeDocumentId;
        const activeDocumentId = persistedDocuments.some(
          (document) => document.id === persistedActiveDocumentId
        )
          ? persistedActiveDocumentId!
          : persistedDocuments[0].id;

        return {
          ...currentState,
          ...typedState,
          documents: persistedDocuments,
          activeDocumentId,
        };
      },
    }
  )
);
