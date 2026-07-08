import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CopyIcon } from '@phosphor-icons/react';

interface HashOutputPanelProps {
  output: string;
  onCopy: () => void;
}

export function HashOutputPanel({ output, onCopy }: HashOutputPanelProps) {
  return (
    <div className="flex min-h-0 flex-col bg-background">
      {/* Header Panel */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border/40 bg-muted/10 px-3 select-none">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">
            Hash Result
          </span>
          <span className="text-[10px] text-muted-foreground/80 hidden sm:inline">
            Auto-calculating
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCopy}
          disabled={!output}
          className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          title="Copy Output"
        >
          <CopyIcon className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Output Viewer Area */}
      <Textarea
        className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-[12px] shadow-none bg-transparent p-3
          focus-visible:ring-0 placeholder:text-muted-foreground/50 text-foreground leading-relaxed select-all"
        placeholder="Calculated hash output will appear here..."
        value={output}
        readOnly
      />
    </div>
  );
}
