import { TextEditor } from '@/components/ui/text-editor';
import { type CustomSection } from '../types';

interface CustomSectionEditorProps {
  section: CustomSection;
  onChange: (content: string) => void;
}

export function CustomSectionEditor({ section, onChange }: CustomSectionEditorProps) {
  return (
    <TextEditor
      path={`custom/${section.key}.md`}
      language="markdown"
      value={section.content}
      onChange={(value) => onChange(value ?? '')}
      options={{
        fontSize: 13,
        lineHeight: 20,
        fontFamily: 'Geist Mono, Menlo, Monaco, Consolas, monospace',
        padding: { top: 16, bottom: 16 },
        scrollBeyondLastLine: false,
        renderLineHighlight: 'all',
        wordWrap: 'on',
        minimap: { enabled: true },
      }}
    />
  );
}