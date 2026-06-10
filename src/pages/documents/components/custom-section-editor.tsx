import { MilkdownEditor } from './milkdown-editor';
import { type CustomSection } from '../types';

interface CustomSectionEditorProps {
  section: CustomSection;
  onChange: (content: string) => void;
}

export function CustomSectionEditor({ section, onChange }: CustomSectionEditorProps) {
  return (
    <div className="h-full">
      <MilkdownEditor
        key={section.key}
        value={section.content}
        onChange={onChange}
      />
    </div>
  );
}