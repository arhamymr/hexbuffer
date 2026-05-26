'use client';

import {
  Activity,
  AlertTriangle,
  Bug,
  FileSearch,
  Globe,
  MousePointerClick,
  Play,
  Route,
  ShieldAlert,
  Square,
  Terminal,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ActionLogEntry } from '@/stores/browser-automation';
import { useBrowserAutomationPage } from './hooks/use-browser-automation-page';

const logTypeStyles: Record<ActionLogEntry['type'], string> = {
  command: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  result: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  error: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
  ai: 'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300',
};

function formatTime(timestamp: Date) {
  return timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function BrowserAutomationPage() {
  const {
    activeTab,
    browserStatus,
    handleUrlChange,
    handleRunAi,
    handleStop,
    handleClearActionLog,
  } = useBrowserAutomationPage();

  if (!activeTab) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border bg-background text-sm text-muted-foreground">
        Browser crawl workspace is loading.
      </div>
    );
  }

  const isBrowserRunning = browserStatus?.running ?? false;
  const snapshot = activeTab.snapshot;
  const interactiveCount = snapshot?.elements.filter((element) => element.interactive).length ?? 0;
  const errorCount = activeTab.actions.filter((action) => action.type === 'error').length;
  const findingStatus = activeTab.isRunning
    ? 'Crawling'
    : activeTab.actions.length > 0
      ? 'Ready'
      : 'Idle';

  return (
    <div className="flex h-full min-h-0 flex-col rounded-md border bg-background">
      <div className="border-b px-3 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted">
              <Globe className="h-4 w-4" />
            </div>
            <Input
              className="h-9 min-w-0 font-mono text-sm"
              placeholder="https://target.local"
              value={activeTab.url}
              onChange={(event) => handleUrlChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && activeTab.url && !activeTab.isRunning) {
                  handleRunAi();
                }
              }}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {activeTab.isRunning ? (
              <Button variant="destructive" size="sm" onClick={handleStop}>
                <Square className="h-4 w-4" />
                Stop
              </Button>
            ) : (
              <Button size="sm" onClick={handleRunAi} disabled={!activeTab.url}>
                <Play className="h-4 w-4" />
                Crawl Target
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleClearActionLog}>
              <Trash2 className="h-4 w-4" />
              Clear Log
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className={cn(isBrowserRunning && 'border-emerald-500/30 text-emerald-600')}>
            Browser {isBrowserRunning ? 'running' : 'closed'}
          </Badge>
          <Badge variant="outline">Status {findingStatus}</Badge>
          <Badge variant="outline">{snapshot?.elements.length ?? 0} elements</Badge>
          <Badge variant="outline">{activeTab.discoveredApis.length} APIs</Badge>
          {errorCount > 0 && (
            <Badge variant="outline" className="border-red-500/30 text-red-600">
              {errorCount} errors
            </Badge>
          )}
          {browserStatus?.url && (
            <span className="min-w-0 truncate font-mono text-muted-foreground">{browserStatus.url}</span>
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(320px,420px)_1fr]">
        <aside className="flex min-h-0 flex-col border-b xl:border-b-0 xl:border-r">
          <div className="grid grid-cols-2 border-b">
            <div className="border-r p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <FileSearch className="h-3.5 w-3.5" />
                Snapshot
              </div>
              <div className="mt-2 text-2xl font-semibold">{snapshot ? 'Captured' : 'Empty'}</div>
              <div className="mt-1 truncate text-xs text-muted-foreground">
                {snapshot?.title || 'No page title'}
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <MousePointerClick className="h-3.5 w-3.5" />
                Interactive
              </div>
              <div className="mt-2 text-2xl font-semibold">{interactiveCount}</div>
              <div className="mt-1 text-xs text-muted-foreground">clickable inputs and controls</div>
            </div>
          </div>

          <div className="grid grid-cols-2 border-b">
            <div className="border-r p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Route className="h-3.5 w-3.5" />
                APIs
              </div>
              <div className="mt-2 text-2xl font-semibold">{activeTab.discoveredApis.length}</div>
              <div className="mt-1 text-xs text-muted-foreground">captured endpoints</div>
            </div>
            <div className="p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <ShieldAlert className="h-3.5 w-3.5" />
                Findings
              </div>
              <div className="mt-2 text-2xl font-semibold">0</div>
              <div className="mt-1 text-xs text-muted-foreground">awaiting analyzer output</div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-10 items-center gap-2 border-b px-3 text-sm font-medium">
              <Bug className="h-4 w-4" />
              Findings
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-2 p-3">
                {errorCount > 0 ? (
                  activeTab.actions
                    .filter((action) => action.type === 'error')
                    .map((action, index) => (
                      <div key={`${action.timestamp.toISOString()}-${index}`} className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          Crawl Error
                        </div>
                        <p className="mt-1 break-words text-xs text-muted-foreground">{action.message}</p>
                      </div>
                    ))
                ) : (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No vulnerability findings yet.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          <div className="flex h-10 items-center justify-between border-b px-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Terminal className="h-4 w-4" />
              Verbose Log
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className={cn('h-3.5 w-3.5', activeTab.isRunning && 'animate-pulse text-emerald-600')} />
              {activeTab.actions.length} events
            </div>
          </div>

          <ScrollArea className="flex-1 bg-muted/20">
            <div className="space-y-1 p-3 font-mono text-xs">
              {activeTab.actions.length === 0 ? (
                <div className="rounded-md border border-dashed bg-background p-4 font-sans text-sm text-muted-foreground">
                  Log is empty.
                </div>
              ) : (
                activeTab.actions.map((action, index) => (
                  <div
                    key={`${action.timestamp.toISOString()}-${index}`}
                    className="grid grid-cols-[78px_72px_minmax(0,1fr)] gap-2 rounded-md border bg-background px-2 py-2"
                  >
                    <span className="text-muted-foreground">{formatTime(action.timestamp)}</span>
                    <Badge variant="outline" className={cn('h-5 justify-center rounded-sm px-1 text-[10px]', logTypeStyles[action.type])}>
                      {action.type.toUpperCase()}
                    </Badge>
                    <span className="min-w-0 break-words leading-5">{action.message}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </section>
      </div>
    </div>
  );
}
