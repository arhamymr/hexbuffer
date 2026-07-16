import { Button } from '@/components/ui/button';
import { TerminalWindowIcon, PlusIcon } from '@phosphor-icons/react';

interface TerminalEmptyStateProps {
  createSession: () => void;
}

export function TerminalEmptyState({ createSession }: TerminalEmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-background p-6 animate-fade-in">
      <TerminalWindowIcon className="size-12 text-muted-foreground/30 mb-3 animate-pulse" />
      <h3 className="text-sm font-semibold text-foreground font-mono">No Terminal Active</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs text-center font-mono">
        All terminal shells have been closed. Open a new shell process to start.
      </p>
      <Button
        size="xs"
        onClick={createSession}
        className="mt-4 px-4 font-mono active:scale-[0.97] transition-transform"
      >
        <PlusIcon className="size-3.5 mr-1.5" />
        Open Terminal
      </Button>
    </div>
  );
}
