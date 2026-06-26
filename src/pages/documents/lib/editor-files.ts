import { type SavedApiEntry, type CustomSection } from '../types';

export type EditorFileId = `custom:${string}` | 'api' | `api:${string}`;

export function isCustomSectionFile(fileId: EditorFileId): fileId is `custom:${string}` {
  return fileId.startsWith('custom:');
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
    const custom = customSections?.find((s) => s.key === fileId.replace('custom:', ''));
    return custom ? `${custom.title.toLowerCase()}.md` : fileId;
  }

  return fileId;
}

export function getFileName(fileId: EditorFileId, apiEntry: SavedApiEntry | null, customSections?: CustomSection[]) {
  if (fileId === 'api') {
    return 'api.md';
  }

  if (fileId.startsWith('api:')) {
    return apiEntry?.path || 'saved-api.http';
  }

  if (fileId.startsWith('custom:')) {
    const custom = customSections?.find((s) => s.key === fileId.replace('custom:', ''));
    const label = custom ? custom.title.toLowerCase().replace(/\s+/g, '-') : fileId.replace('custom:', '');
    return `${label}.md`;
  }

  return fileId;
}
