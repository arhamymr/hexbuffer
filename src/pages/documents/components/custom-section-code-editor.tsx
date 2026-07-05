import { TextEditor } from '@/components/ui/text-editor';
import { type CustomSection } from '../types';

interface CustomSectionCodeEditorProps {
  documentId: string;
  section: CustomSection;
  onChange: (content: string) => void;
}

export function CustomSectionCodeEditor({
  documentId,
  section,
  onChange,
}: CustomSectionCodeEditorProps) {
  return (
    <TextEditor
      path={`${documentId}/sections/${section.key}.md`}
      value={section.content}
      onChange={(value) => onChange(value ?? '')}
      language="markdown"
      detectLinks={true}
    />
  );
}
