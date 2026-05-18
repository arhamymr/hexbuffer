import { DOCUMENT_SECTION_DEFINITIONS, type DocumentSectionKey } from './constants';

export type DocumentSections = Record<DocumentSectionKey, string>;

export interface ReconDocument {
  id: string;
  name: string;
  title: string;
  sections: DocumentSections;
  createdAt: string;
  updatedAt: string;
}

export function createEmptySections(): DocumentSections {
  return DOCUMENT_SECTION_DEFINITIONS.reduce((sections, section) => {
    sections[section.key] = '';
    return sections;
  }, {} as DocumentSections);
}

export function createDocument(index: number): ReconDocument {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name: `Document ${index}`,
    title: '',
    sections: createEmptySections(),
    createdAt: now,
    updatedAt: now,
  };
}
