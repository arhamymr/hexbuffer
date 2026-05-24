import { DOCUMENT_SECTION_DEFINITIONS, type DocumentSectionKey } from '../constants';
import { type SavedApiEntry } from '../types';

export type EditorFileId = DocumentSectionKey | 'api' | `api:${string}`;

export const EXPLORER_SECTIONS = DOCUMENT_SECTION_DEFINITIONS.map((section) => section.key);

export function isDocumentSectionFile(fileId: EditorFileId): fileId is DocumentSectionKey {
  return fileId !== 'api' && !fileId.startsWith('api:');
}

export function getSectionDefinition(sectionKey: DocumentSectionKey) {
  return DOCUMENT_SECTION_DEFINITIONS.find((section) => section.key === sectionKey);
}

export function getFileLabel(fileId: EditorFileId, apiEntry: SavedApiEntry | null) {
  if (fileId === 'api') {
    return 'api';
  }

  if (fileId.startsWith('api:')) {
    return apiEntry?.path || 'saved-api.http';
  }

  return isDocumentSectionFile(fileId)
    ? getSectionDefinition(fileId)?.title.toLowerCase() ?? fileId
    : fileId;
}

export function getFileName(fileId: EditorFileId, apiEntry: SavedApiEntry | null) {
  if (fileId === 'api') {
    return 'api.md';
  }

  if (fileId.startsWith('api:')) {
    return apiEntry?.path || 'saved-api.http';
  }

  const label = isDocumentSectionFile(fileId)
    ? getSectionDefinition(fileId)?.title.toLowerCase() ?? fileId
    : fileId;

  return `${label.replace(/\s+/g, '-')}.md`;
}
