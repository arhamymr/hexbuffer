import { TextEditor } from '@/components/ui/text-editor';
import { type CustomSection } from '../types';

interface CustomSectionCodeEditorProps {
  documentId: string;
  section: CustomSection;
  onChange: (content: string) => void;
}

const markdownCodeEditorOptions = {
  fontSize: 13,
  lineHeight: 20,
  fontFamily: 'Geist Mono, Menlo, Monaco, Consolas, monospace',
  padding: { top: 16, bottom: 16 },
  scrollBeyondLastLine: false,
  minimap: { enabled: true },
} as const;

export function CustomSectionCodeEditor({
  documentId,
  section,
  onChange,
}: CustomSectionCodeEditorProps) {
  return (
    <TextEditor
      path={`${documentId}/sections/${section.key}.md`}
      language="markdown"
      value={section.content}
      onChange={(value) => onChange(value ?? '')}
      options={markdownCodeEditorOptions}
    />
  );
}
