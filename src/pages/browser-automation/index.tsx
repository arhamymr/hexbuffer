'use client';

import { useState } from 'react';

import { ChevronDownIcon, EyeIcon, Pause, Play, RotateCcw, Search, Square, Target, InfoIcon } from 'lucide-react';
import { ActivityLogPanel } from './components/ActivityLogPanel';
import { AiInsightsPanel } from './components/insight-panel';
import { CrawlOverviewPanel } from './components/overview-panel';
import { CrawlSetupScreen } from './components/setup-screen';
import { CrawlTreePanel } from './components/tree-panel';
import { PageDetailPanel } from './components/page-detail-panel';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ButtonGroup } from '@/components/ui/button-group';
import { Input } from '@/components/ui/input';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { useAppStore } from '@/stores/app';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { useBrowserAutomationPage } from './hooks/use-page';
import { toast } from 'sonner';

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

  const [isStarting, setIsStarting] = useState(false);
  const proxyStatus = useAppStore((state) => state.proxyStatus);
  const startProxy = useAppStore((state) => state.startProxy);

  const handleStartProxy = async () => {
    setIsStarting(true);
    try {
      await startProxy();
      toast.success('Proxy started');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start proxy');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <>

      {proxyStatus !== 'connected' && (
        <div className='p-2'>
          <Alert variant="default" className="mb-2 min-h-11 items-center shrink-0 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertDescription className="flex items-center gap-2 text-amber-700 dark:text-amber-200/70">
              <span>Start the proxy to intercept HTTP requests.</span>
            </AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                size="xs"
                className="h-6 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-500/50 dark:text-amber-300 dark:hover:bg-amber-500/20"
                onClick={handleStartProxy}
                disabled={isStarting || proxyStatus === 'starting'}
              >
                Start Proxy
              </Button>
            </AlertAction>
          </Alert>
        </div>
      )}

      {!browserAutomationSafetyAlertDismissed && (
        <div className="p-2">
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
                <ButtonGroup>
                  <Button variant="outline" size="xs" onClick={pauseCrawl} disabled={!isRunning} aria-label="Pause">
                    <Pause className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="xs" onClick={resumeCrawl} disabled={!isPaused} aria-label="Resume">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="xs" onClick={stopCrawl} disabled={!isRunning && !isPaused} aria-label="Stop">
                    <Square className="h-4 w-4" />
                  </Button>
                </ButtonGroup>
                <ButtonGroup>
                  <Button size="xs" onClick={() => startCrawl(true)} disabled={proxyStatus === "disconnected" || isRunning || !setup.targetUrl.trim()}>
                    <Play className="h-4 w-4" />
                    Start
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="xs" variant="outline" disabled={isRunning || !setup.targetUrl.trim()} aria-label="More start options">
                        <ChevronDownIcon className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem className='text-xs' onClick={() => startCrawl(true)}>
                        <Play className="size-3.5" />
                        Start (Headless)
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className='text-xs' onClick={() => startCrawl(false)}>
                        <EyeIcon className="size-3.5" />
                        Start Visible
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </ButtonGroup>
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
                      searchQuery={search}
                    />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={20} minSize={20}>
                    <PageDetailPanel page={selectedPage} searchQuery={search} />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={20} minSize={20}>
                    <AiInsightsPanel
                      insights={filteredInsights}
                      interestingPages={interestingPages}
                      searchQuery={search}
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
                    <ActivityLogPanel
                      logs={filteredLogs}
                      searchQuery={search}
                      onSubmitHumanInput={submitHumanInput}
                    />
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
