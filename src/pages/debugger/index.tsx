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
  MagnifyingGlassIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  ArrowsLeftRightIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BugIcon,
  CopyIcon,
  CheckIcon,
} from '@phosphor-icons/react';
import { useDebuggerPage } from './hooks/use-debugger-page';
import { EventRow } from './components/event-row';
import { JsonViewer } from './components/json-viewer';
import { EVENT_COLORS } from './constants';
import { formatTimestamp } from './lib/format-timestamp';

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
    setCopyPayload,
    copied,
    handleCopy,
    copyPayload,
  } = useDebuggerPage();

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="bg-muted px-3 py-2 border-b flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <BugIcon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Workflow Debugger</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {entries.length}
          </Badge>
          {paused && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500/50 text-amber-600">
              Paused
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-52">
            <MagnifyingGlassIcon className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-7 h-7 text-xs bg-background"
              placeholder="FunnelIcon events..."
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
            {paused ? <PlayIcon className="size-3.5 mr-1" /> : <PauseIcon className="size-3.5 mr-1" />}
            {paused ? 'Resume' : 'PauseIcon'}
          </Button>

          <Button variant="outline" onClick={clearEntries}>
            <TrashIcon className="size-3.5 mr-1" />
            Clear
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <ResizablePanelGroup orientation="horizontal" className="min-h-0">
          <ResizablePanel defaultSize={45} minSize={25}>
            <div className="flex h-full flex-col min-h-0 border-r">
              <div className="px-2 py-1 border-b flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
                <ArrowsLeftRightIcon className="size-3" />
                <span>Event Timeline</span>
                <span className="flex gap-1 ml-auto">
                  <span className="flex items-center gap-0.5">
                    <ArrowRightIcon className="size-2.5 text-blue-500" /> in
                  </span>
                  <span className="flex items-center gap-0.5">
                    <ArrowLeftIcon className="size-2.5 text-emerald-500" /> out
                  </span>
                </span>
              </div>

              <ScrollArea className="flex-1">
                {entries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-6">
                    <BugIcon className="size-8 opacity-30" />
                    <p className="text-xs text-center">Waiting for workflow events...</p>
                    <p className="text-[10px] opacity-60 text-center">
                      Start a browser crawl or send a chat message to see I/O data.
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
                      className={cn('text-[10px] px-1 py-0 h-4', EVENT_COLORS[selectedEntry.eventType] ?? '')}
                    >
                      {selectedEntry.label}
                    </Badge>
                    <span className={cn('text-[10px] ml-auto', selectedEntry.direction === 'input' ? 'text-blue-500' : 'text-emerald-500')}>
                      {selectedEntry.direction === 'input' ? 'INPUT' : 'OUTPUT'}
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-5 px-1.5"
                      onClick={handleCopy}
                      disabled={!copyPayload}
                    >
                      {copied ? <CheckIcon className="size-3 text-green-500" /> : <CopyIcon className="size-3" />}
                    </Button>
                  </>
                )}
              </div>

              <div className="flex-1 min-h-0 flex flex-col">
                {selectedEntry ? (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="px-3 py-1.5 border-b bg-muted/20 text-[10px] text-muted-foreground flex items-center gap-2 shrink-0">
                      <span>{formatTimestamp(selectedEntry.timestamp)}</span>
                      <span className="truncate">{selectedEntry.summary}</span>
                    </div>

                    <div className="px-3 py-1.5 border-b bg-muted/10 text-[10px] text-muted-foreground flex items-center gap-2 shrink-0">
                      <span>Event: <code className="bg-muted px-1 rounded">{selectedEntry.eventType}</code></span>
                      <span>Direction: <code className="bg-muted px-1 rounded">{selectedEntry.direction}</code></span>
                    </div>

                    <div className="flex-1 min-h-0">
                      <JsonViewer data={selectedEntry.payload} onCopyRef={setCopyPayload} />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-6">
                    <ArrowsLeftRightIcon className="size-8 opacity-30" />
                    <p className="text-xs">Select an event to inspect its payload</p>
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

