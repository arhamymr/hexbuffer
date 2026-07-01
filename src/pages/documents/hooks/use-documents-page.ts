import * as React from 'react';
import { useDocumentsStore } from '@/stores/documents';
import { useShallow } from 'zustand/react/shallow';
import { type DocumentTemplateId } from '../constants';
import { type ReconDocument, type CustomSection, type MarkdownEditorMode } from '../types';
import { exportDocumentToPdf } from '../lib/export-document';
import {
  getCustomSectionDefinition,
  getFileLabel,
  getFileName,
  isCustomSectionFile,
  type EditorFileId,
} from '../lib/editor-files';

function getDefaultFileId(document: ReconDocument | null | undefined): EditorFileId | null {
  const firstSection = document?.customSections[0];
  return firstSection ? `custom:${firstSection.key}` : null;
}

const MAX_CUSTOM_SECTION_HISTORY = 100;

interface CustomSectionHistory {
  past: string[];
  future: string[];
}

function getEmptySectionHistory(): CustomSectionHistory {
  return { past: [], future: [] };
}

export function useDocumentsPage() {
  const [markdownMode, setMarkdownMode] = React.useState<MarkdownEditorMode>('code');

  const {
    documents,
    activeDocumentId,
    setActiveDocumentId,
    addDocument,
    loadFromDb,
    updateDocument,
    closeDocument,
  } = useDocumentsStore(
    useShallow((s) => ({
      documents: s.documents,
      activeDocumentId: s.activeDocumentId,
      setActiveDocumentId: s.setActiveDocumentId,
      addDocument: s.addDocument,
      loadFromDb: s.loadFromDb,
      updateDocument: s.updateDocument,
      closeDocument: s.closeDocument,
    }))
  );

  React.useEffect(() => {
    void loadFromDb().catch((error) => {
      console.error('Failed to load documents from database:', error);
    });
  }, [loadFromDb]);

  const activeDocument = React.useMemo(
    () => documents.find((document) => document.id === activeDocumentId) ?? documents[0] ?? null,
    [activeDocumentId, documents]
  );

  const [activeFileId, setActiveFileId] = React.useState<EditorFileId | null>(null);
  const [openFileIds, setOpenFileIds] = React.useState<EditorFileId[]>([]);
  const [documentIdPendingDelete, setDocumentIdPendingDelete] = React.useState<string | null>(
    null
  );
  const [isCustomSectionDialogOpen, setIsCustomSectionDialogOpen] = React.useState(false);
  const [customSectionPendingRename, setCustomSectionPendingRename] =
    React.useState<CustomSection | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [customSectionHistory, setCustomSectionHistory] = React.useState<
    Record<string, CustomSectionHistory>
  >({});

  // ponytail: Reset / sync active file when document switches (YAGNI default clean)
  React.useEffect(() => {
    if (activeDocument) {
      const defaultId = getDefaultFileId(activeDocument);
      if (defaultId) {
        setActiveFileId(defaultId);
        setOpenFileIds([defaultId]);
      } else {
        setActiveFileId(null);
        setOpenFileIds([]);
      }
    } else {
      setActiveFileId(null);
      setOpenFileIds([]);
    }
  }, [activeDocumentId, activeDocument]);

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

  const applyCustomSectionContent = React.useCallback(
    (sectionKey: string, content: string) => {
      updateActiveDocument((document) => {
        let didUpdate = false;
        const customSections = document.customSections.map((section) => {
          if (section.key !== sectionKey || section.content === content) {
            return section;
          }

          didUpdate = true;
          return { ...section, content };
        });

        if (!didUpdate) {
          return document;
        }

        return {
          ...document,
          customSections,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [updateActiveDocument]
  );

  const addCustomSection = React.useCallback(
    (title: string, description: string, placeholder: string) => {
      if (!activeDocumentId) return '';
      return useDocumentsStore.getState().addCustomSection(activeDocumentId, {
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
      const remainingSections =
        activeDocument?.customSections.filter((section) => section.key !== sectionKey) ?? [];
      const fallbackFileId = getDefaultFileId(activeDocument);

      useDocumentsStore.getState().removeCustomSection(activeDocumentId, sectionKey);
      setOpenFileIds((fileIds) => {
        const nextFileIds = fileIds.filter((fileId) => fileId !== `custom:${sectionKey}`);
        return nextFileIds.length ? nextFileIds : (fallbackFileId ? [fallbackFileId] : []);
      });
      if (activeFileId === `custom:${sectionKey}`) {
        setActiveFileId(fallbackFileId);
      }
      setCustomSectionHistory((historyBySection) => {
        const { [sectionKey]: _removedHistory, ...nextHistoryBySection } = historyBySection;
        return nextHistoryBySection;
      });
    },
    [activeDocument, activeDocumentId, activeFileId]
  );

  const reorderCustomSections = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!activeDocumentId) return;
      useDocumentsStore.getState().reorderCustomSections(activeDocumentId, fromIndex, toIndex);
    },
    [activeDocumentId]
  );

  const updateCustomSection = React.useCallback(
    (sectionKey: string, content: string) => {
      let previousContent: string | null = null;

      updateActiveDocument((document) => {
        let didUpdate = false;
        const customSections = document.customSections.map((section) => {
          if (section.key !== sectionKey || section.content === content) {
            return section;
          }

          didUpdate = true;
          previousContent = section.content;
          return { ...section, content };
        });

        if (!didUpdate) {
          return document;
        }

        return {
          ...document,
          customSections,
          updatedAt: new Date().toISOString(),
        };
      });

      if (previousContent !== null) {
        const previousContentForHistory = previousContent;
        setCustomSectionHistory((historyBySection) => {
          const sectionHistory = historyBySection[sectionKey] ?? getEmptySectionHistory();
          return {
            ...historyBySection,
            [sectionKey]: {
              past: [...sectionHistory.past, previousContentForHistory].slice(
                -MAX_CUSTOM_SECTION_HISTORY
              ),
              future: [],
            },
          };
        });
      }
    },
    [updateActiveDocument]
  );

  const renameCustomSection = React.useCallback(
    (sectionKey: string, title: string, description: string, placeholder: string) => {
      if (!activeDocumentId) return;
      useDocumentsStore.getState().renameCustomSection(activeDocumentId, sectionKey, {
        title,
        description,
        placeholder,
      });
      setCustomSectionPendingRename(null);
    },
    [activeDocumentId]
  );

  const openFile = React.useCallback(
    (fileId: EditorFileId) => {
      if (fileId.startsWith('custom:')) {
        const key = fileId.replace('custom:', '');
        const exists = activeDocument?.customSections.some((section) => section.key === key);
        if (!exists) return;
      }

      setActiveFileId(fileId);
      setOpenFileIds((fileIds) =>
        fileIds.includes(fileId) ? fileIds : [...fileIds, fileId]
      );
    },
    [activeDocument]
  );

  const closeFile = React.useCallback(
    (fileId: EditorFileId) => {
      setOpenFileIds((fileIds) => {
        const nextFileIds = fileIds.filter((openFileId) => openFileId !== fileId);
        const fallbackFileId = getDefaultFileId(activeDocument);
        const normalizedFileIds: EditorFileId[] = nextFileIds.length
          ? nextFileIds
          : (fallbackFileId ? [fallbackFileId] : []);

        if (activeFileId === fileId) {
          setActiveFileId(normalizedFileIds[normalizedFileIds.length - 1] ?? null);
        }

        return normalizedFileIds;
      });
    },
    [activeDocument, activeFileId]
  );

  const handleAddDocument = React.useCallback((templateId: DocumentTemplateId = 'blank') => {
    const createdDocumentId = addDocument(templateId);
    const createdDocument =
      useDocumentsStore.getState().documents.find((document) => document.id === createdDocumentId) ??
      null;
    const defaultFileId = getDefaultFileId(createdDocument);
    setActiveFileId(defaultFileId);
    setOpenFileIds(defaultFileId ? [defaultFileId] : []);
  }, [addDocument]);

  const openTemplateDialog = React.useCallback(() => {
    setIsTemplateDialogOpen(true);
  }, []);

  const requestDocumentDelete = React.useCallback((documentId: string) => {
    setDocumentIdPendingDelete(documentId);
  }, []);

  const cancelDocumentDelete = React.useCallback(() => {
    setDocumentIdPendingDelete(null);
  }, []);

  const confirmDocumentDelete = React.useCallback(() => {
    if (!documentIdPendingDelete) {
      return;
    }

    closeDocument(documentIdPendingDelete);
    setDocumentIdPendingDelete(null);
    setActiveFileId(null);
    setOpenFileIds([]);
  }, [closeDocument, documentIdPendingDelete]);

  const handleAddCustomSection = React.useCallback(
    (title: string, description: string, placeholder: string) => {
      const sectionKey = addCustomSection(title, description, placeholder);
      if (sectionKey) {
        const newFileId: EditorFileId = `custom:${sectionKey}`;
        setActiveFileId(newFileId);
        setOpenFileIds((fileIds) =>
          fileIds.includes(newFileId) ? fileIds : [...fileIds, newFileId]
        );
      }
    },
    [addCustomSection]
  );

  const handleRenameCustomSection = React.useCallback(
    (title: string, description: string, placeholder: string) => {
      if (!customSectionPendingRename) return;
      renameCustomSection(customSectionPendingRename.key, title, description, placeholder);
    },
    [customSectionPendingRename, renameCustomSection]
  );

  const handleExportPdf = React.useCallback(async () => {
    if (!activeDocument || exporting) return;

    try {
      setExporting(true);
      await exportDocumentToPdf(activeDocument);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setExporting(false);
    }
  }, [activeDocument, exporting]);

  const documentPendingDelete = React.useMemo(
    () => documents.find((document) => document.id === documentIdPendingDelete) ?? null,
    [documentIdPendingDelete, documents]
  );

  const isCustomSectionFileFlag = activeFileId ? isCustomSectionFile(activeFileId) : false;
  const activeCustomSection = isCustomSectionFileFlag && activeFileId
    ? getCustomSectionDefinition(
        activeDocument?.customSections ?? [],
        activeFileId.replace('custom:', '')
      ) ?? null
    : null;
  const activeCustomSectionHistory = activeCustomSection
    ? customSectionHistory[activeCustomSection.key] ?? getEmptySectionHistory()
    : getEmptySectionHistory();
  const canUndoCustomSection = activeCustomSectionHistory.past.length > 0;
  const canRedoCustomSection = activeCustomSectionHistory.future.length > 0;
  const undoCustomSectionChange = React.useCallback(() => {
    if (!activeCustomSection) {
      return;
    }

    const previousContent =
      activeCustomSectionHistory.past[activeCustomSectionHistory.past.length - 1];
    if (previousContent === undefined) {
      return;
    }

    setCustomSectionHistory((historyBySection) => ({
      ...historyBySection,
      [activeCustomSection.key]: {
        past: activeCustomSectionHistory.past.slice(0, -1),
        future: [activeCustomSection.content, ...activeCustomSectionHistory.future],
      },
    }));
    applyCustomSectionContent(activeCustomSection.key, previousContent);
  }, [activeCustomSection, activeCustomSectionHistory, applyCustomSectionContent]);
  const redoCustomSectionChange = React.useCallback(() => {
    if (!activeCustomSection) {
      return;
    }

    const nextContent = activeCustomSectionHistory.future[0];
    if (nextContent === undefined) {
      return;
    }

    setCustomSectionHistory((historyBySection) => ({
      ...historyBySection,
      [activeCustomSection.key]: {
        past: [...activeCustomSectionHistory.past, activeCustomSection.content].slice(
          -MAX_CUSTOM_SECTION_HISTORY
        ),
        future: activeCustomSectionHistory.future.slice(1),
      },
    }));
    applyCustomSectionContent(activeCustomSection.key, nextContent);
  }, [activeCustomSection, activeCustomSectionHistory, applyCustomSectionContent]);

  const activeLabel = activeFileId ? getFileLabel(
    activeFileId,
    activeDocument?.customSections
  ) : '';

  return {
    markdownMode,
    setMarkdownMode,
    tabs: documents.map((document) => ({
      id: document.id,
      name: document.title.trim() || document.name,
    })),
    activeDocumentId,
    setActiveDocumentId,
    addDocument: handleAddDocument,
    openTemplateDialog,
    isTemplateDialogOpen,
    setIsTemplateDialogOpen,
    closeDocument: requestDocumentDelete,
    activeDocument,
    renameDocument,
    updateTitle,
    addCustomSection,
    removeCustomSection,
    reorderCustomSections,
    updateCustomSection,
    undoCustomSectionChange,
    redoCustomSectionChange,
    canUndoCustomSection,
    canRedoCustomSection,
    activeFileId,
    openFileIds,
    openFile,
    closeFile,
    activeCustomSection,
    activeLabel,
    isCustomSectionFile: isCustomSectionFileFlag,
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
  };
}
