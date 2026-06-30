import * as React from 'react';
import { useScratchpadStore } from '@/stores/scratchpad';
import { TextEditor } from '@/components/ui/text-editor';

export function ScratchpadPage() {
  const { note, setNote } = useScratchpadStore();

  return (
    <div className="h-full w-full overflow-hidden bg-background p-3 flex flex-col gap-2">
      <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-background">
        <TextEditor
          value={note}
          onChange={(value) => setNote(value ?? '')}
          language="markdown"
          height="100%"
        />
      </div>
    </div>
  );
}
