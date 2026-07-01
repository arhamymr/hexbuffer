import { type CustomSection } from '../types';

// ponytail: Simplified EditorFileId to only custom sections (YAGNI)
export type EditorFileId = `custom:${string}`;

export function isCustomSectionFile(fileId: EditorFileId): fileId is `custom:${string}` {
  return fileId.startsWith('custom:');
}

export function getCustomSectionDefinition(customSections: CustomSection[], sectionKey: string) {
  return customSections.find((section) => section.key === sectionKey);
}

export function getFileLabel(fileId: EditorFileId, customSections?: CustomSection[]) {
  if (fileId.startsWith('custom:')) {
    const custom = customSections?.find((s) => s.key === fileId.replace('custom:', ''));
    return custom ? `${custom.title.toLowerCase()}.md` : fileId;
  }

  return fileId;
}

export function getFileName(fileId: EditorFileId, customSections?: CustomSection[]) {
  if (fileId.startsWith('custom:')) {
    const custom = customSections?.find((s) => s.key === fileId.replace('custom:', ''));
    const label = custom ? custom.title.toLowerCase().replace(/\s+/g, '-') : fileId.replace('custom:', '');
    return `${label}.md`;
  }

  return fileId;
}
