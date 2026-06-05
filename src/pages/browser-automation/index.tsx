'use client';

import { Pause, Play, RotateCcw, Search, Square, Target, InfoIcon } from 'lucide-react';
import { ActivityLogPanel } from './components/ActivityLogPanel';
import { AiInsightsPanel } from './components/insight-panel';
import { CrawlOverviewPanel } from './components/overview-panel';
import { CrawlSetupScreen } from './components/setup-screen';
import { CrawlTreePanel } from './components/tree-panel';
import { PageDetailPanel } from './components/page-detail-panel';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    submitHumanInput,
    setSearch,
  } = useBrowserAutomationStore();

  if (!activeTab) {
    return null;
  }

  const {
    setup,
    session,
    expandedPageIds,
    search,
  } = activeTab;

  const status = session?.status ?? 'idle';
  const isRunning = status === 'running';
  const isPaused = status === 'paused';

  return (
    <>
      {!browserAutomationSafetyAlertDismissed && (
        <div className='p-2'>
          <Alert variant="default" className="min-h-12 mb-0 shrink-0 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
            <InfoIcon className='!text-amber-600 shrink-0' />
            <AlertDescription className='text-amber-600'>
              The browser automation will interact with external websites. Only scan targets you own or are authorized to assess. Unauthorized scanning may violate terms of service or applicable laws.
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
        </div>
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
            <div className="flex flex-row gap-3 xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="relative w-full max-w-[230px]">
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
                  Start
                </Button>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1">
            <ResizablePanelGroup orientation="vertical" className="min-h-0">
              <ResizablePanel defaultSize={60} minSize={20}>
                <ResizablePanelGroup orientation="horizontal" className="min-h-0">
                  <ResizablePanel defaultSize={20} minSize={20}>
                    <CrawlTreePanel
                      nodes={crawlTree}
                      selectedPageId={selectedPage?.id ?? null}
                      expandedPageIds={expandedPageIds}
                    />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={20} minSize={20}>
                    <PageDetailPanel page={selectedPage} />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={20} minSize={20}>
                    <AiInsightsPanel
                      insights={filteredInsights}
                      interestingPages={interestingPages}
                    />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={14}>
                <ResizablePanelGroup orientation="horizontal">
                  <ResizablePanel defaultSize={20} minSize={14}>
                    <CrawlOverviewPanel overview={overview} />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={80} minSize={22}>
                    <ActivityLogPanel logs={filteredLogs} onSubmitHumanInput={submitHumanInput} />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          </main>
        </div>
      </TabbedPageLayout>
    </>
  );
}
