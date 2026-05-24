import { DOCUMENT_SECTION_DEFINITIONS, type DocumentSectionKey } from '../constants';
import { type SavedApiEntry, type CustomSection } from '../types';

export type EditorFileId = DocumentSectionKey | `custom:${string}` | 'api' | `api:${string}`;

export const EXPLORER_SECTIONS = DOCUMENT_SECTION_DEFINITIONS.map((section) => section.key);

export function isDocumentSectionFile(fileId: EditorFileId): fileId is DocumentSectionKey {
  return fileId !== 'api' && !fileId.startsWith('api:') && !fileId.startsWith('custom:');
}

export function isCustomSectionFile(fileId: EditorFileId): fileId is `custom:${string}` {
  return fileId.startsWith('custom:');
}

export function getSectionDefinition(sectionKey: DocumentSectionKey) {
  return DOCUMENT_SECTION_DEFINITIONS.find((section) => section.key === sectionKey);
}

export function getCustomSectionDefinition(customSections: CustomSection[], sectionKey: string) {
  return customSections.find((section) => section.key === sectionKey);
}

export function getFileLabel(fileId: EditorFileId, apiEntry: SavedApiEntry | null, customSections?: CustomSection[]) {
  if (fileId === 'api') {
    return 'api';
  }

  if (fileId.startsWith('api:')) {
    return apiEntry?.path || 'saved-api.http';
  }

  if (fileId.startsWith('custom:')) {
    const custom = customSections?.find((s) => s.key === fileId);
    return custom ? `${custom.title.toLowerCase()}.md` : fileId;
  }

  return isDocumentSectionFile(fileId)
    ? getSectionDefinition(fileId)?.title.toLowerCase() ?? fileId
    : fileId;
}

export function getFileName(fileId: EditorFileId, apiEntry: SavedApiEntry | null, customSections?: CustomSection[]) {
  if (fileId === 'api') {
    return 'api.md';
  }

  if (fileId.startsWith('api:')) {
    return apiEntry?.path || 'saved-api.http';
  }

  if (fileId.startsWith('custom:')) {
    const custom = customSections?.find((s) => s.key === fileId);
    const label = custom ? custom.title.toLowerCase().replace(/\s+/g, '-') : fileId.replace('custom:', '');
    return `${label}.md`;
  }

  const label = isDocumentSectionFile(fileId)
    ? getSectionDefinition(fileId)?.title.toLowerCase() ?? fileId
    : fileId;

  return `${label.replace(/\s+/g, '-')}.md`;
}
