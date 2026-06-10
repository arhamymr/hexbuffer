import { MilkdownEditor } from './milkdown-editor';
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
    <div className="h-full">
      <MilkdownEditor
        key={sectionKey}
        value={document.sections[sectionKey]}
        onChange={(value) => onChange(sectionKey, value)}
      />
    </div>
  );
}
