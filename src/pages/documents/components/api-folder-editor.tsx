import { TextEditor } from '@/components/ui/text-editor';
import { type ReconDocument } from '../types';

interface ApiFolderEditorProps {
  document: ReconDocument;
}

export function ApiFolderEditor({ document }: ApiFolderEditorProps) {
  return (
    <TextEditor
      path={`${document.id}/api.md`}
      language="markdown"
      value={[
        '# api',
        '',
        document.apiEntries.length
          ? 'Select a saved request from the explorer to open it.'
          : 'No APIs saved yet. Right-click a request in HTTP History and choose "Save to Documents".',
        '',
        ...document.apiEntries.map((entry) => `- ${entry.method} ${entry.url}`),
      ].join('\n')}
      options={{ readOnly: true }}
    />
  );
}
