import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TrashIcon } from '@phosphor-icons/react';

interface EncoderInputPanelProps {
  headerLabel: string;
  input: string;
  mode: string;
  isEmpty: boolean;
  onInputChange: (v: string) => void;
  onClear: () => void;
}

export function EncoderInputPanel({
  headerLabel,
  input,
  mode,
  isEmpty,
  onInputChange,
  onClear,
}: EncoderInputPanelProps) {
  return (
    <div className="flex min-h-0 flex-col border-b bg-background lg:border-b-0 lg:border-r">
      <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
            {headerLabel}
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            Enter content to {mode}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          disabled={isEmpty}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <TrashIcon className="h-3 w-3" />
        </Button>
      </div>
      <Textarea
        className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3"
        placeholder={`Enter ${headerLabel.toLowerCase()}...`}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
      />
    </div>
  );
}
