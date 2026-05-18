import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createDocument, type ReconDocument } from '@/pages/documents/types';

interface DocumentsState {
  documents: ReconDocument[];
  activeDocumentId: string;
  setActiveDocumentId: (id: string) => void;
  addDocument: () => string;
  updateDocument: (id: string, updater: (document: ReconDocument) => ReconDocument) => void;
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

export const useDocumentsStore = create<DocumentsState>()(
  persist(
    (set) => ({
      documents: [initialDocument],
      activeDocumentId: initialDocument.id,
      setActiveDocumentId: (id) => set({ activeDocumentId: id }),
      addDocument: () => {
        let createdDocumentId = '';

        set((state) => {
          const newDocument = createDocument(getNextDocumentIndex(state.documents));
          createdDocumentId = newDocument.id;

          return {
            documents: [...state.documents, newDocument],
            activeDocumentId: newDocument.id,
          };
        });

        return createdDocumentId;
      },
      updateDocument: (id, updater) =>
        set((state) => ({
          documents: state.documents.map((document) =>
            document.id === id ? updater(document) : document
          ),
        })),
      closeDocument: (id) =>
        set((state) => {
          const remainingDocuments = state.documents.filter((document) => document.id !== id);

          if (remainingDocuments.length === 0) {
            const replacementDocument = createDocument(1);
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
      name: 'apprecon-documents',
      partialize: (state) => ({
        documents: state.documents,
        activeDocumentId: state.activeDocumentId,
      }),
      merge: (persistedState, currentState) => {
        const typedState = persistedState as Partial<DocumentsState> | undefined;
        const persistedDocuments = typedState?.documents?.length
          ? typedState.documents
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
