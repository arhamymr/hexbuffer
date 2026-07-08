import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TrashIcon } from '@phosphor-icons/react';

interface HashInputPanelProps {
  input: string;
  isEmpty: boolean;
  onInputChange: (v: string) => void;
  onClear: () => void;
}

export function HashInputPanel({ input, isEmpty, onInputChange, onClear }: HashInputPanelProps) {
  return (
    <div className="flex min-h-0 flex-col bg-background">
      {/* Header Panel */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border/40 bg-muted/10 px-3 select-none">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
            Input Text
          </span>
          <span className="text-[10px] text-muted-foreground/80 hidden sm:inline">
            Enter plaintext below
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          disabled={isEmpty}
          className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          title="Clear Input"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Input Editor Area */}
      <Textarea
        className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-[12px] shadow-none bg-transparent p-3
          focus-visible:ring-0 placeholder:text-muted-foreground/50 text-foreground leading-relaxed"
        placeholder="Enter text to hash here..."
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
      />
    </div>
  );
}
