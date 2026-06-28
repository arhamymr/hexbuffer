import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CopyIcon } from '@phosphor-icons/react';

interface EncoderOutputPanelProps {
  headerLabel: string;
  output: string;
  error: string | null;
  onCopy: () => void;
}

export function EncoderOutputPanel({
  headerLabel,
  output,
  error,
  onCopy,
}: EncoderOutputPanelProps) {
  return (
    <div className="flex min-h-0 flex-col bg-background">
      <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
            {headerLabel}
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            Auto-updates
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCopy}
          disabled={!output}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <CopyIcon className="h-3 w-3" />
        </Button>
      </div>
      {error ? (
        <div className="min-h-0 flex-1 bg-destructive/5 p-4 text-xs font-mono text-destructive whitespace-pre-wrap overflow-auto">
          {error}
        </div>
      ) : (
        <Textarea
          className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3"
          placeholder={`${headerLabel} output will appear here...`}
          value={output}
          readOnly
        />
      )}
    </div>
  );
}
