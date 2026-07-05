import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowsOutIcon } from '@phosphor-icons/react';
import { TextEditor } from '@/components/ui/text-editor';
import { useScratchpadStore } from '@/stores/scratchpad';
import { useNavStore } from '@/stores/nav';

export function ScratchpadWidget() {
  const { note, setNote } = useScratchpadStore();
  const navigate = useNavigate();

  const handleExpand = () => {
    const navStore = useNavStore.getState();
    const pathname = '/scratchpad';
    navStore.openWindow(pathname, 'Scratchpad');
    navStore.focusWindow(pathname, navigate);
  };

  return (
    <div className="p-2 rounded-md border bg-muted backdrop-blur-md flex flex-col gap-2">
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">Scratchpad</span>
        <button
          onClick={handleExpand}
          className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          title="Expand scratchpad"
        >
          <ArrowsOutIcon className="size-3" />
        </button>
      </div>
      <div className="h-34 overflow-hidden rounded-sm border">
        <TextEditor
          value={note}
          onChange={(value) => setNote(value ?? '')}
          language="markdown"
          height="100%"
          detectLinks={true}
        />
      </div>
    </div>
  );
}
