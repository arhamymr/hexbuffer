import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { GearSixIcon, EraserIcon, ClockCounterClockwiseIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface TerminalToolbarProps {
  activeSessionName?: string;
  clearActiveSessionBuffer: () => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  shellPath: string;
  setShellPath: (path: string) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export function TerminalToolbar({
  activeSessionName,
  clearActiveSessionBuffer,
  fontSize,
  setFontSize,
  shellPath,
  setShellPath,
  isSidebarOpen,
  toggleSidebar,
}: TerminalToolbarProps) {
  const [localShellPath, setLocalShellPath] = React.useState(shellPath);

  // Sync shell path state from parent if config updates
  React.useEffect(() => {
    setLocalShellPath(shellPath);
  }, [shellPath]);

  const handleShellPathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localShellPath.trim()) {
      setShellPath(localShellPath.trim());
    }
  };

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/20 px-3 gap-4 select-none">
      {/* Left: Active Shell Info */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Active Shell:</span>
        <span className="text-[11px] font-mono font-semibold text-emerald-500">
          {activeSessionName || 'None'}
        </span>
      </div>

      {/* Right: Global Controls & Settings */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Toggle Command History Sidebar */}
        <Button
          size="xs"
          variant="ghost"
          onClick={toggleSidebar}
          className={cn(
            "h-7 w-7 p-0 flex items-center justify-center rounded-md active:scale-[0.97] transition-all",
            isSidebarOpen 
              ? "text-emerald-500 bg-emerald-500/10 border border-emerald-500/20" 
              : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
          )}
          title="Toggle Command History Sidebar"
        >
          <ClockCounterClockwiseIcon className="size-4" />
        </Button>

        {/* Clear Buffer */}
        <Button
          size="xs"
          variant="ghost"
          onClick={clearActiveSessionBuffer}
          className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-accent/40 active:scale-[0.97] transition-transform"
          title="Clear terminal buffer"
        >
          <EraserIcon className="size-4 mr-1.5" />
          <span className="text-[11px] font-mono">Clear</span>
        </Button>

        {/* Settings Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="xs"
              variant="ghost"
              className="h-7 w-7 p-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40 active:scale-[0.97] transition-transform"
              title="Terminal Settings"
            >
              <GearSixIcon className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 bg-popover border-border text-popover-foreground p-4">
            <div className="space-y-4">
              <div className="border-b border-border pb-2">
                <h4 className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-wider">Terminal Settings</h4>
              </div>

              {/* Shell Path Settings */}
              <form onSubmit={handleShellPathSubmit} className="space-y-1.5">
                <Label htmlFor="shell-path" className="text-[11px] font-mono text-muted-foreground">Shell Executable Path</Label>
                <div className="flex gap-2">
                  <Input
                    id="shell-path"
                    value={localShellPath}
                    onChange={(e) => setLocalShellPath(e.target.value)}
                    className="h-7 text-xs bg-input/20 border-border text-foreground font-mono"
                    placeholder="/bin/zsh"
                  />
                  <Button type="submit" size="xs" className="h-7 text-[11px]">
                    Save
                  </Button>
                </div>
              </form>

              {/* Font Size Settings */}
              <div className="space-y-2">
                <Label className="text-[11px] font-mono text-muted-foreground">Font Size ({fontSize}px)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="24"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="flex-1 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setFontSize(fontSize - 1)}
                      className="h-6 w-6 p-0 flex items-center justify-center font-mono border-border bg-input/10 hover:bg-accent"
                    >
                      -
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setFontSize(fontSize + 1)}
                      className="h-6 w-6 p-0 flex items-center justify-center font-mono border-border bg-input/10 hover:bg-accent"
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground font-mono">
                Default: /bin/zsh. Settings will persist across sessions.
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
