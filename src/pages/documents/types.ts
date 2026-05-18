import { DOCUMENT_SECTION_DEFINITIONS, type DocumentSectionKey } from './constants';

export type DocumentSections = Record<DocumentSectionKey, string>;

export interface ReconDocument {
  id: string;
  name: string;
  title: string;
  sections: DocumentSections;
  apiEntries: SavedApiEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedApiEntry {
  id: string;
  sourceHistoryId: string;
  method: string;
  url: string;
  host: string;
  path: string;
  headers: Record<string, string>;
  requestBody: string | null;
  responseStatus: number | null;
  responseContentType: string | null;
  capturedAt: number;
  savedAt: string;
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
    apiEntries: [],
    createdAt: now,
    updatedAt: now,
  };
}
