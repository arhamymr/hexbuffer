import {
  DOCUMENT_SECTION_DEFINITIONS,
  getDocumentTemplate,
  type DocumentSectionKey,
  type DocumentTemplateId,
} from './constants';

export type DocumentSections = Record<string, string>;
export type MarkdownEditorMode = 'markdown' | 'code' | 'preview';

export interface CustomSection {
  key: string;
  title: string;
  description: string;
  placeholder: string;
  content: string;
}

export interface ReconDocument {
  id: string;
  name: string;
  title: string;
  sections: DocumentSections;
  removedBuiltInSections: DocumentSectionKey[];
  customSections: CustomSection[];
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

export function createDocument(index: number, templateId: DocumentTemplateId = 'blank'): ReconDocument {
  const now = new Date().toISOString();
  const template = getDocumentTemplate(templateId);
  const templateSectionFiles = Object.entries(template.sections).map(([sectionKey, content]) => {
    const sectionDefinition = DOCUMENT_SECTION_DEFINITIONS.find(
      (section) => section.key === sectionKey
    );

    return {
      key: `template-${template.id}-${sectionKey}-${crypto.randomUUID()}`,
      title: sectionDefinition?.title ?? sectionKey,
      description: sectionDefinition?.description ?? '',
      placeholder: sectionDefinition?.placeholder ?? '',
      content: content ?? '',
    };
  });
  const customSections = [
    ...templateSectionFiles,
    ...template.customSections.map((section, sectionIndex) => ({
      ...section,
      key: `template-${template.id}-${sectionIndex + 1}-${crypto.randomUUID()}`,
    })),
  ];

  return {
    id: crypto.randomUUID(),
    name: `Document ${index}`,
    title: template.documentTitle,
    sections: createEmptySections(),
    removedBuiltInSections: [],
    customSections,
    apiEntries: [],
    createdAt: now,
    updatedAt: now,
  };
}
