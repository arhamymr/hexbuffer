import * as React from 'react';
import { StickyNote } from 'lucide-react';

export function ScratchpadWidget() {
  const [note, setNote] = React.useState(() => localStorage.getItem('desktop-scratchpad') ?? '');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNote(val);
    localStorage.setItem('desktop-scratchpad', val);
  };

  return (
    <div className="p-2 rounded-md border bg-card/30 dark:bg-card/10 backdrop-blur-md flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <StickyNote className="size-3.5 text-primary" />
        <span className="text-[10px] font-mono font-bold tracking-wider text-muted-foreground uppercase">Scratchpad</span>
      </div>
      <textarea
        value={note}
        onChange={handleChange}
        placeholder="Type quick notes here (autosaved)..."
        className="w-full h-24 p-2 bg-muted/20 dark:bg-black/10 border  rounded-sm text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none font-sans"
      />
    </div>
  );
}
