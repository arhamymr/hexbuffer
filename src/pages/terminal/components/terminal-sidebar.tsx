import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Input } from '@/components/ui/input';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { cn } from '@/lib/utils';
import {
  Copy as CopyIcon,
  Play as PlayIcon,
  Trash as TrashIcon,
  ClockCounterClockwise as ClockCounterClockwiseIcon,
} from '@phosphor-icons/react';

interface TerminalSidebarProps {
  recentCommands: string[];
  clearRecentCommands: () => void;
  runCommand: (cmd: string) => void;
}

const PREDEFINED_COMMANDS = [
  'sudo nano /etc/hosts',
  'ping -c 4 target.htb',
  'nmap -sC -sV -oA nmap/initial target.htb',
  'nmap -p- --min-rate 5000 -oA nmap/allports target.htb',
  'gobuster dir -u http://target.htb -w /usr/share/wordlists/dirb/common.txt',
  'wfuzz -c -w /usr/share/wordlists/dirb/common.txt --hc 404 http://target.htb/FUZZ',
  'curl -iv http://target.htb',
  'nc -lvnp 4444',
  'python3 -m http.server 80',
  'ssh target.htb',
  'cat /etc/passwd',
  'find / -perm -u=s -type f 2>/dev/null',
  'sudo -l',
  'uname -a'
];

export function TerminalSidebar({
  recentCommands,
  clearRecentCommands,
  runCommand,
}: TerminalSidebarProps) {
  const { copy } = useCopyToClipboard();
  const [activeTab, setActiveTab] = React.useState<'recent' | 'common'>('recent');
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredRecent = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return recentCommands;
    return recentCommands.filter((cmd) => cmd.toLowerCase().includes(q));
  }, [recentCommands, searchQuery]);

  const filteredCommon = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return PREDEFINED_COMMANDS;
    return PREDEFINED_COMMANDS.filter((cmd) => cmd.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <div className="flex flex-col h-full bg-card border-l border-border select-none">
      {/* Sidebar Header */}
      <div className="flex h-10 items-center justify-between px-3 border-b bg-muted/10 shrink-0">
        <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px] font-bold uppercase tracking-wider">
          <ClockCounterClockwiseIcon className="size-4 text-emerald-500" />
          <span>Commands</span>
        </div>
        {activeTab === 'recent' && recentCommands.length > 0 && (
          <Button
            size="xs"
            variant="ghost"
            onClick={clearRecentCommands}
            className="h-6 px-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 active:scale-[0.97] transition-all"
            title="Clear history"
          >
            <TrashIcon className="size-3.5 mr-1" />
            <span className="text-[10px] font-mono">Clear</span>
          </Button>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="px-2 py-1.5 bg-muted/5 shrink-0 flex justify-center">
        <ButtonGroup className="w-full">
          <Button
            variant="outline"
            size="xs"
            className={cn(
              'flex-1 text-[10px] font-mono h-6',
              activeTab === 'recent' && 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:text-emerald-500',
            )}
            data-state={activeTab === 'recent' ? 'on' : 'off'}
            onClick={() => setActiveTab('recent')}
          >
            Recent ({recentCommands.length})
          </Button>
          <Button
            variant="outline"
            size="xs"
            className={cn(
              'flex-1 text-[10px] font-mono h-6',
              activeTab === 'common' && 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:text-emerald-500',
            )}
            data-state={activeTab === 'common' ? 'on' : 'off'}
            onClick={() => setActiveTab('common')}
          >
            HTB Common
          </Button>
        </ButtonGroup>
      </div>

      {/* Search Bar */}
      <div className="px-2 pb-1.5 border-b bg-muted/5 shrink-0">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search commands..."
          className="h-7 text-xs bg-input/20 border-border text-foreground font-mono focus-visible:ring-emerald-500/55 focus-visible:border-emerald-500/55"
        />
      </div>

      {/* Items list viewport */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/60">
        {activeTab === 'recent' ? (
          filteredRecent.length > 0 ? (
            filteredRecent.map((cmd, idx) => (
              <div
                key={idx}
                onClick={() => runCommand(cmd)}
                className="group relative flex items-center justify-between p-2 rounded border border-border/40 hover:border-border bg-card/40 hover:bg-accent/40 cursor-pointer transition-all duration-150 active:scale-[0.99]"
                title="Click to execute command directly"
              >
                {/* Command text block */}
                <div className="font-mono text-[11px] text-foreground truncate pr-16 select-text" title={cmd}>
                  {cmd}
                </div>

                {/* Hover Actions overlay */}
                <div className="absolute right-1.5 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-150 pointer-events-auto">
                  <Button
                    size="xs"
                    variant="outline"
                    className="h-5 w-5 p-0 flex items-center justify-center bg-background border-border hover:bg-accent active:scale-[0.95]"
                    onClick={(e) => {
                      e.stopPropagation();
                      copy(cmd, 'Command copied!');
                    }}
                    title="Copy command"
                  >
                    <CopyIcon className="size-3 text-muted-foreground" />
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    className="h-5 w-5 p-0 flex items-center justify-center bg-background border-border hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 active:scale-[0.95]"
                    onClick={(e) => {
                      e.stopPropagation();
                      runCommand(cmd);
                    }}
                    title="Execute command"
                  >
                    <PlayIcon className="size-3" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground/60 p-4 pt-16">
              <ClockCounterClockwiseIcon className="size-8 text-muted-foreground/20 mb-2" />
              <p className="text-[11px] font-mono leading-relaxed">
                {searchQuery.trim() ? 'No matching commands.' : 'No recent commands.\nType and run commands to build history.'}
              </p>
            </div>
          )
        ) : (
          filteredCommon.length > 0 ? (
            filteredCommon.map((cmd, idx) => (
              <div
                key={idx}
                onClick={() => runCommand(cmd)}
                className="group relative flex items-center justify-between p-2 rounded border border-border/40 hover:border-border bg-card/40 hover:bg-accent/40 cursor-pointer transition-all duration-150 active:scale-[0.99]"
                title="Click to execute command directly"
              >
                {/* Command text block */}
                <div className="font-mono text-[11px] text-foreground truncate pr-16 select-text" title={cmd}>
                  {cmd}
                </div>

                {/* Hover Actions overlay */}
                <div className="absolute right-1.5 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-150 pointer-events-auto">
                  <Button
                    size="xs"
                    variant="outline"
                    className="h-5 w-5 p-0 flex items-center justify-center bg-background border-border hover:bg-accent active:scale-[0.95]"
                    onClick={(e) => {
                      e.stopPropagation();
                      copy(cmd, 'Command copied!');
                    }}
                    title="Copy command"
                  >
                    <CopyIcon className="size-3 text-muted-foreground" />
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    className="h-5 w-5 p-0 flex items-center justify-center bg-background border-border hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 active:scale-[0.95]"
                    onClick={(e) => {
                      e.stopPropagation();
                      runCommand(cmd);
                    }}
                    title="Execute command"
                  >
                    <PlayIcon className="size-3" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground/60 p-4 pt-16">
              <ClockCounterClockwiseIcon className="size-8 text-muted-foreground/20 mb-2" />
              <p className="text-[11px] font-mono leading-relaxed">
                No matching HTB commands.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
