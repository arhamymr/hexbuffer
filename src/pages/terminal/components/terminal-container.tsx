import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SpinnerGapIcon, PlayIcon, WarningCircleIcon } from '@phosphor-icons/react';

// Import xterm.css so helper elements (like the textarea) are styled/hidden off-screen correctly
import '@xterm/xterm/css/xterm.css';

interface TerminalContainerProps {
  id: string;
  registerContainer: (id: string, el: HTMLDivElement | null) => void;
  isActive: boolean;
  status: 'spawning' | 'ready' | 'exited';
  onRestart: () => void;
  logHistory?: string[];
}

// ponytail: keep terminal mounted in DOM with exact size to prevent xterm 0x0 display:none calculation errors
export const TerminalContainer = React.memo(({
  id,
  registerContainer,
  isActive,
  status,
  onRestart,
  logHistory
}: TerminalContainerProps) => {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);

  // status is reactive Zustand state — fire registerContainer every time it becomes 'ready'.
  // We cannot use isSessionReady(id) here because terminalInstances is a plain Map
  // (not reactive), so React would never know it changed and the effect would never re-run.
  React.useEffect(() => {
    if (status === 'ready' && viewportRef.current) {
      registerContainer(id, viewportRef.current);
    }
  }, [id, status, registerContainer]);

  return (
    <div
      className={cn(
        "w-full h-full relative transition-opacity duration-150",
        isActive
          ? "opacity-100 relative pointer-events-auto z-10"
          : "opacity-0 absolute inset-0 pointer-events-none z-0"
      )}
    >
      {/* 1. Spawning / Loading Overlay */}
      {status === 'spawning' && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3 select-none">
          <SpinnerGapIcon className="size-8 text-emerald-500 animate-spin" />
          <p className="text-xs font-mono text-muted-foreground animate-pulse">
            Starting shell process...
          </p>
        </div>
      )}

      {/* 2. Exited / Recovery Overlay */}
      {status === 'exited' && (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4 p-4 text-center">
          <WarningCircleIcon className="size-10 text-amber-500 animate-bounce" />
          <div className="space-y-1">
            <h4 className="text-xs font-mono font-bold text-foreground">Terminal Shell Inactive</h4>
            <p className="text-[11px] font-mono text-muted-foreground max-w-xs leading-normal">
              The underlying shell process has exited or failed to initialize.
            </p>
          </div>
          <Button
            size="xs"
            onClick={onRestart}
            className="font-mono text-xs px-4 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500 active:scale-[0.97] transition-all"
            variant="outline"
          >
            <PlayIcon className="size-3.5 mr-1.5" />
            Wake Up Terminal
          </Button>

          {/* Diagnostic Console Box */}
          {logHistory && logHistory.length > 0 && (
            <div className="mt-2 w-full max-w-md bg-zinc-950 border border-zinc-800 rounded p-2 text-left select-text">
              <p className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Diagnostic Logs:
              </p>
              <div className="max-h-24 overflow-y-auto">
                <pre className="text-[9px] font-mono text-zinc-400 leading-normal whitespace-pre-wrap">
                  {logHistory.join('\n')}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. The Terminal Viewport — always in the DOM, xterm attaches here */}
      <div
        ref={viewportRef}
        className="w-full h-full [&_.xterm]:h-full [&_.xterm-viewport]:scrollbar-thin [&_.xterm-viewport]:scrollbar-track-transparent [&_.xterm-viewport]:scrollbar-thumb-border/60"
      />
    </div>
  );
});

TerminalContainer.displayName = 'TerminalContainer';
