import { TextEditor } from '@/components/ui/text-editor';
import { type DocumentSectionKey } from '../constants';
import { type ReconDocument } from '../types';

interface DocumentMarkdownEditorProps {
  document: ReconDocument;
  sectionKey: DocumentSectionKey;
  onChange: (sectionKey: DocumentSectionKey, value: string) => void;
}

export function DocumentMarkdownEditor({
  document,
  sectionKey,
  onChange,
}: DocumentMarkdownEditorProps) {
  return (
    <TextEditor
      path={`${document.id}/${sectionKey}.md`}
      language="markdown"
      value={document.sections[sectionKey]}
      onChange={(value) => onChange(sectionKey, value ?? '')}
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
