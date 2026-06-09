'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Search,
  Pause,
  Play,
  Trash2,
  ArrowRightLeft,
  ArrowLeft,
  ArrowRight,
  Bug,
  Copy,
  Check,
} from 'lucide-react';
import { useDebuggerPage } from './hooks/use-debugger-page';
import type { DebuggerEntry } from '@/stores/debugger';

const EVENT_COLORS: Record<string, string> = {
  // Crawl events
  session_started: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  session_finished: 'bg-green-500/10 text-green-600 border-green-500/30',
  session_failed: 'bg-red-500/10 text-red-600 border-red-500/30',
  page_discovered: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
  page_visited: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30',
  insight_created: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  log_created: 'bg-slate-500/10 text-slate-600 border-slate-500/30',
  human_input_requested: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
  // Chat events
  chat_action: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30',
  human_selection_required: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  } catch {
    return iso;
  }
}

function EventRow({
  entry,
  isSelected,
  onClick,
}: {
  entry: DebuggerEntry;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 py-1.5 px-2 border-b border-border cursor-pointer text-xs transition-colors',
        isSelected ? 'bg-accent' : 'hover:bg-muted/50'
      )}
      onClick={onClick}
    >
      <span className="text-muted-foreground text-[10px] font-mono shrink-0 w-[84px]">
        {formatTimestamp(entry.timestamp)}
      </span>

      <span className="shrink-0 mt-px">
        {entry.direction === 'input' ? (
          <ArrowRight className="size-3 text-blue-500" />
        ) : (
          <ArrowLeft className="size-3 text-emerald-500" />
        )}
      </span>

      <Badge
        variant="outline"
        className={cn(
          'text-[10px] px-1 py-0 h-4 shrink-0',
          EVENT_COLORS[entry.eventType] ?? ''
        )}
      >
        {entry.label}
      </Badge>

      <span className="truncate flex-1 min-w-0">{entry.summary}</span>
    </div>
  );
}

function JsonViewer({ data, onCopyRef }: { data: unknown; onCopyRef?: (fn: () => void) => void }) {
  const text = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  const copyPayload = useCallback(() => {
    navigator.clipboard.writeText(text).catch(() => {});
  }, [text]);

  // Expose copy function to parent via ref-style callback
  useMemo(() => {
    onCopyRef?.(copyPayload);
  }, [onCopyRef, copyPayload]);

  return (
    <ScrollArea className="h-full">
      <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all text-muted-foreground leading-relaxed">
        {text}
      </pre>
    </ScrollArea>
  );
}

export function DebuggerPage() {
  const {
    entries,
    selectedEntry,
    paused,
    search,
    selectEntry,
    togglePaused,
    setSearch,
    clearEntries,
  } = useDebuggerPage();

  const [copyPayload, setCopyPayload] = useState<(() => void) | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    copyPayload?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [copyPayload]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="bg-muted px-3 py-2 border-b flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Bug className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Workflow Debugger</span>
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-4"
          >
            {entries.length}
          </Badge>
          {paused && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 border-amber-500/50 text-amber-600"
            >
              Paused
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-52">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-7 h-7 text-xs bg-background"
              placeholder="Filter events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            size="xs"
            onClick={togglePaused}
            className={paused ? 'border-amber-500/50 text-amber-600' : ''}
          >
            {paused ? (
              <Play className="size-3.5 mr-1" />
            ) : (
              <Pause className="size-3.5 mr-1" />
            )}
            {paused ? 'Resume' : 'Pause'}
          </Button>

          <Button variant="outline" size="xs" onClick={clearEntries}>
            <Trash2 className="size-3.5 mr-1" />
            Clear
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <ResizablePanelGroup orientation="horizontal" className="min-h-0">
          <ResizablePanel defaultSize={45} minSize={25}>
            <div className="flex h-full flex-col min-h-0 border-r">
              <div className="px-2 py-1 border-b flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
                <ArrowRightLeft className="size-3" />
                <span>Event Timeline</span>
                <span className="flex gap-1 ml-auto">
                  <span className="flex items-center gap-0.5">
                    <ArrowRight className="size-2.5 text-blue-500" /> in
                  </span>
                  <span className="flex items-center gap-0.5">
                    <ArrowLeft className="size-2.5 text-emerald-500" /> out
                  </span>
                </span>
              </div>

              <ScrollArea className="flex-1">
                {entries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-6">
                    <Bug className="size-8 opacity-30" />
                    <p className="text-xs text-center">
                      Waiting for workflow events...
                    </p>
                    <p className="text-[10px] opacity-60 text-center">
                      Start a browser crawl or send a chat message to see I/O
                      data.
                    </p>
                  </div>
                ) : (
                  <div>
                    {entries.map((entry) => (
                      <EventRow
                        key={entry.id}
                        entry={entry}
                        isSelected={selectedEntry?.id === entry.id}
                        onClick={() => selectEntry(entry.id)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={55} minSize={25}>
            <div className="flex h-full flex-col min-h-0">
              <div className="px-3 py-1.5 border-b flex items-center gap-2 text-xs font-medium bg-muted/30 shrink-0">
                <span>Payload Inspector</span>
                {selectedEntry && (
                  <>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1 py-0 h-4',
                        EVENT_COLORS[selectedEntry.eventType] ?? ''
                      )}
                    >
                      {selectedEntry.label}
                    </Badge>
                    <span
                      className={cn(
                        'text-[10px] ml-auto',
                        selectedEntry.direction === 'input'
                          ? 'text-blue-500'
                          : 'text-emerald-500'
                      )}
                    >
                      {selectedEntry.direction === 'input'
                        ? 'INPUT'
                        : 'OUTPUT'}
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-5 px-1.5"
                      onClick={handleCopy}
                      disabled={!copyPayload}
                    >
                      {copied ? (
                        <Check className="size-3 text-green-500" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </Button>
                  </>
                )}
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                {selectedEntry ? (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="px-3 py-1.5 border-b bg-muted/20 text-[10px] text-muted-foreground flex items-center gap-2 shrink-0">
                      <span>
                        {formatTimestamp(selectedEntry.timestamp)}
                      </span>
                      <span className="truncate">
                        {selectedEntry.summary}
                      </span>
                    </div>

                    <div className="px-3 py-1.5 border-b bg-muted/10 text-[10px] text-muted-foreground flex items-center gap-2 shrink-0">
                      <span>
                        Event:{' '}
                        <code className="bg-muted px-1 rounded">
                          {selectedEntry.eventType}
                        </code>
                      </span>
                      <span>
                        Direction:{' '}
                        <code className="bg-muted px-1 rounded">
                          {selectedEntry.direction}
                        </code>
                      </span>
                    </div>

                    <div className="flex-1 min-h-0">
                      <JsonViewer data={selectedEntry.payload} onCopyRef={setCopyPayload} />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-6">
                    <ArrowRightLeft className="size-8 opacity-30" />
                    <p className="text-xs">
                      Select an event to inspect its payload
                    </p>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
