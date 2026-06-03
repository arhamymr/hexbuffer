'use client';

import { Pause, Play, RotateCcw, Search, Square, Target, InfoIcon } from 'lucide-react';
import { ActivityLogPanel } from './components/ActivityLogPanel';
import { AiInsightsPanel } from './components/InsightsPanel';
import { CrawlOverviewPanel } from './components/AutomationOverviewPanel';
import { CrawlSetupScreen } from './components/AutomationSetupScreen';
import { CrawlTreePanel } from './components/AutomationTreePanel';
import { PageDetailDrawer } from './components/PageDetailDrawer';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { useAppStore } from '@/stores/app';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { useBrowserAutomationPage } from './hooks/use-page';

export function BrowserAutomationPage() {
  const browserAutomationSafetyAlertDismissed = useAppStore(
    (state) => state.browserAutomationSafetyAlertDismissed
  );
  const setBrowserAutomationSafetyAlertDismissed = useAppStore(
    (state) => state.setBrowserAutomationSafetyAlertDismissed
  );

  const {
    tabs,
    activeTabId,
    setActiveTabId,
    renameTab,
    closeTab,
    activeTab,
    crawlTree,
    selectedPage,
    filteredInsights,
    filteredLogs,
    interestingPages,
    overview,
  } = useBrowserAutomationPage();

  const {
    updateSetup,
    saveConfig,
    startCrawl,
    pauseCrawl,
    resumeCrawl,
    stopCrawl,
    clearHumanInputRequest,
    setSearch,
  } = useBrowserAutomationStore();

  if (!activeTab) {
    return null;
  }

  const {
    setup,
    session,
    expandedPageIds,
    humanInputRequest,
    search,
    analyzingPageIds,
  } = activeTab;

  const status = session?.status ?? 'idle';
  const isRunning = status === 'running';
  const isPaused = status === 'paused';

  return (
    <>
      {!browserAutomationSafetyAlertDismissed && (
        <Alert variant="default" className="mb-2 min-h-12 shrink-0 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
          <InfoIcon className='!text-amber-600' />
          <AlertDescription className='text-amber-600'>
            The AI browser automation agent will interact with external websites. Only scan targets you own or are authorized to assess. Unauthorized scanning may violate terms of service or applicable laws.
          </AlertDescription>
          <AlertAction>
            <Button
              variant="outline"
              aria-label="Dismiss safety notice"
              onClick={() => setBrowserAutomationSafetyAlertDismissed(true)}
            >
              Dismiss
            </Button>
          </AlertAction>
        </Alert>
      )}
      <TabbedPageLayout
        tabs={tabs}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
        onTabRename={renameTab}
        onTabClose={closeTab}
        contentClassName="flex-1 border rounded-md overflow-hidden bg-background min-h-0"
      >
        <div className="flex h-full min-h-0 flex-col bg-background">
          <header className="bg-muted px-3 py-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex gap-2 items-center min-w-0 truncate text-xs text-muted-foreground">
                  <Target className='size-3' /> <span className="font-mono font-semibold text-foreground">{session?.targetUrl || setup.targetUrl || '-'}</span>
                </div>
                <div className="relative w-full max-w-[250px]">
                  <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8 bg-background"
                    placeholder="Search pages, logs, insights..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <CrawlSetupScreen
                  setup={setup}
                  disabled={isRunning}
                  onSetupChange={updateSetup}
                  onSave={saveConfig}
                />
                <Button variant="outline" size="xs" onClick={pauseCrawl} disabled={!isRunning}>
                  <Pause className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="xs" onClick={resumeCrawl} disabled={!isPaused}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="xs" onClick={stopCrawl} disabled={!isRunning && !isPaused}>
                  <Square className="h-4 w-4" />
                </Button>
                <Button size="xs" onClick={startCrawl} disabled={isRunning || !setup.targetUrl.trim()}>
                  <Play className="h-4 w-4" />
                  Start Automation
                </Button>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1">
            <ResizablePanelGroup orientation="vertical" className="min-h-0">
              <ResizablePanel defaultSize={32} minSize={22}>
                <ActivityLogPanel logs={filteredLogs} />
              </ResizablePanel>

              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={30}>
                <ResizablePanelGroup orientation="horizontal" className="min-h-0">
                  <ResizablePanel defaultSize={30} minSize={14}>
                    <CrawlOverviewPanel overview={overview} />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={30} minSize={24}>
                    <CrawlTreePanel
                      nodes={crawlTree}
                      selectedPageId={selectedPage?.id ?? null}
                      expandedPageIds={expandedPageIds}
                    />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={30} minSize={28}>
                    <AiInsightsPanel
                      insights={filteredInsights}
                      interestingPages={interestingPages}
                      analyzingPageIds={analyzingPageIds}
                    />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          </main>

          <PageDetailDrawer page={selectedPage} />

          <Dialog open={Boolean(humanInputRequest)} onOpenChange={(open) => {
            if (!open) clearHumanInputRequest();
          }}>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Human Input Required</DialogTitle>
                <DialogDescription>
                  The AI agent skipped a restricted workflow and continued with safe crawl targets.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="rounded-md border p-3">
                  <div className="font-medium">Reason</div>
                  <p className="mt-1 text-muted-foreground">{humanInputRequest?.reason}</p>
                </div>
                {humanInputRequest?.url ? (
                  <div className="min-w-0 rounded-md border p-3">
                    <div className="font-medium">Page</div>
                    <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{humanInputRequest.url}</p>
                  </div>
                ) : null}
                {humanInputRequest?.requestedFields.length ? (
                  <div className="rounded-md border p-3">
                    <div className="font-medium">Requested Fields</div>
                    <p className="mt-1 text-muted-foreground">{humanInputRequest.requestedFields.join(', ')}</p>
                  </div>
                ) : null}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resumeCrawl}>
                  Continue
                </Button>
                <Button variant="outline" onClick={clearHumanInputRequest}>
                  Skip Branch
                </Button>
                <Button onClick={stopCrawl}>
                  Stop Automation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TabbedPageLayout>
    </>
  );
}
