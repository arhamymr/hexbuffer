import * as React from 'react';
import { NoteIcon, ArrowsOutIcon, ArrowsInIcon } from '@phosphor-icons/react';
import { TextEditor } from '@/components/ui/text-editor';

export function ScratchpadWidget() {
  const [note, setNote] = React.useState(() => localStorage.getItem('desktop-scratchpad') ?? '');
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleChange = (value: string | undefined) => {
    const val = value ?? '';
    setNote(val);
    localStorage.setItem('desktop-scratchpad', val);
  };

  const editorElement = (
    <TextEditor
      value={note}
      onChange={handleChange}
      language="markdown"
      height="100%"
    />
  );

  return (
    <>
      {/* Collapsed widget */}
      <div className="p-2 rounded-md border bg-muted backdrop-blur-md flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">Scratchpad</span>
          <button
            onClick={() => setIsExpanded(true)}
            className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            title="Expand scratchpad"
          >
            <ArrowsOutIcon className="size-3" />
          </button>
        </div>
        <div className="h-34 overflow-hidden rounded-sm border">
          {editorElement}
        </div>
      </div>

      {/* Expanded overlay */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="w-[90vw] max-w-4xl h-[80vh] rounded-lg border bg-background shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
              <div className="flex items-center gap-1.5">
                <NoteIcon className="size-3.5 text-muted-foreground" />
                <span className="text-[11px] font-mono font-bold tracking-wider text-muted-foreground uppercase">Scratchpad</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                title="Collapse scratchpad"
              >
                <ArrowsInIcon className="size-3.5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {editorElement}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
