import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, PlayIcon, SquareIcon } from '@phosphor-icons/react';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { InvokerConfigDialog } from './components/invoker-config';
import { InvokerPayloadDialog } from './components/payload-dialog';
import { InvokerResultsPanel } from './components/results-panel';
import { InvokerResultInspector } from './components/result-inspector';
import { useInvokerPage } from './hooks/use-page';
import { stopInvokerUiAttack } from '@/triggers';
import { useInvokerStore } from '@/stores/invoker';

export function InvokerPage() {
  const page = useInvokerPage();
  
  // Read state directly from the store for selectedResult to wire up the inspector
  const selectedResult = useInvokerStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab?.selectedResult ?? null;
  });
  const setSelectedResult = useInvokerStore((s) => s.setSelectedResult);

  if (!page.activeTab) {
    return null;
  }

  // Calculate progress percentage
  const percentage = page.progress 
    ? Math.round((page.progress.current / page.progress.total) * 100) 
    : 0;

  return (
    <>
      {/* Condensed safety warning banner */}
      {!page.invokerSafetyAlertDismissed && (
        <div className="p-2 shrink-0">
          <Alert variant="default" className="min-h-10 border-amber-500/30 bg-amber-500/5 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200 flex items-center justify-between gap-3 px-3 py-1.5 rounded-md">
            <div className="flex items-center gap-2">
              <Info className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-xs text-amber-800 dark:text-amber-300 font-sans leading-normal">
                Only run invoker tests against systems you own or are explicitly authorized to assess. Unauthorized assessments can be illegal.
              </AlertDescription>
            </div>
            <Button
              variant="outline"
              size="xs"
              aria-label="Dismiss safety notice"
              onClick={() => page.setInvokerSafetyAlertDismissed(true)}
            >
              Dismiss
            </Button>
          </Alert>
        </div>
      )}

      <TabbedPageLayout
        tabs={page.tabs}
        activeTabId={page.activeTabId}
        onTabChange={page.setActiveTabId}
        onTabRename={page.renameTab}
        onTabClose={page.closeTab}
        contentClassName="flex-1 border rounded-lg overflow-hidden bg-background min-h-0"
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Top Control Toolbar */}
          <div className="relative flex items-center justify-between px-3 py-2 border-b bg-muted/20 shrink-0 select-none">
            <div className="flex items-center gap-3">
              {page.isRunning ? (
                <Button 
                  size="xs" 
                  variant="destructive" 
                  onClick={stopInvokerUiAttack}
                >
                  <SquareIcon className="size-3" /> Stop Attack
                </Button>
              ) : (
                <Button 
                  size="xs" 
                  variant="default"
                  onClick={page.handleStartAttack} 
                  disabled={!!page.startBlockedReason}
                >
                  <PlayIcon className="size-3" /> Start Attack
                </Button>
              )}

              {/* Status Indicator */}
              <div className="flex items-center gap-1.5 border-l pl-3 border-border">
                <span className={`h-2 w-2 rounded-full ${page.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/45'}`} />
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {page.isRunning ? 'Running' : 'Ready'}
                </span>
              </div>

              {/* Safety / Start Blocked Warnings */}
              {!page.isRunning && page.startBlockedReason && (
                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {page.startBlockedReason}
                </span>
              )}
            </div>

            {/* Compact Progress Info */}
            {page.isRunning && page.progress && (
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span>Progress:</span>
                <span className="font-mono text-foreground">
                  {page.progress.current} / {page.progress.total} ({percentage}%)
                </span>
              </div>
            )}

            {/* Slick bottom border progress line */}
            {page.isRunning && page.progress && (
              <div
                className="absolute bottom-0 left-0 h-[2px] bg-primary transition-all duration-300 ease-out"
                style={{ width: `${percentage}%` }}
              />
            )}
          </div>

          {/* Main workspace (Simplified 50/50 Grid layout) */}
          <div className="flex-1 min-h-0 min-w-0 bg-muted/10">
            <div className="grid grid-cols-2 h-full min-h-0 divide-x divide-border bg-background">
              {/* Left Column: Attack configurations and Request templates */}
              <div className="flex flex-col min-h-0 p-3 overflow-auto">
                <InvokerConfigDialog 
                  isRunning={page.isRunning} 
                  progress={page.progress} 
                  startBlockedReason={page.startBlockedReason} 
                />
              </div>

              {/* Right Column: Results & inspector view */}
              <div className="flex flex-col min-h-0 overflow-hidden">
                {selectedResult ? (
                  <div className="grid grid-rows-2 h-full min-h-0 divide-y divide-border">
                    {/* Top Row: Results list table */}
                    <div className="flex flex-col min-h-0 p-3 pb-1.5">
                      <InvokerResultsPanel />
                    </div>

                    {/* Bottom Row: Inline Request / Response inspector */}
                    <div className="flex flex-col min-h-0">
                      {page.activeTab.config && (
                        <InvokerResultInspector 
                          selectedResult={selectedResult} 
                          config={page.activeTab.config} 
                          onClose={() => setSelectedResult(null)} 
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full p-3">
                    <InvokerResultsPanel />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dialog helpers rendered off-canvas */}
          <InvokerPayloadDialog />
        </div>
      </TabbedPageLayout>
    </>
  );
}
