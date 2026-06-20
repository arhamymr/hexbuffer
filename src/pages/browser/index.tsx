'use client';

import { useState } from 'react';

import { InfoIcon } from 'lucide-react';
import { AiInsightsPanel } from './components/insight-panel';
import { ActionLogPanel } from './components/ActionLogPanel';
import { CrawlSetupScreen } from './components/setup-screen';
import { CrawlTreePanel } from './components/tree-panel';
import { PageDetailPanel } from './components/page-detail-panel';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { useAppStore } from '@/stores/app';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { useShallow } from 'zustand/react/shallow';
import type { ActionLogEntry } from '@/stores/browser-automation';
import { useBrowserAutomationPage } from './hooks/use-page';
import { toast } from 'sonner';
import { CrawlStatusBadge } from '@/components/status-badge';

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
    interestingPages,
  } = useBrowserAutomationPage();

  const {
    updateSetup,
    saveConfig,
    clearLogs,
  } = useBrowserAutomationStore(
    useShallow((s) => ({
      updateSetup: s.updateSetup,
      saveConfig: s.saveConfig,
      clearLogs: s.clearLogs,
    }))
  );

  if (!activeTab) {
    return null;
  }

  const {
    setup,
    session,
    expandedPageIds,
    search,
    logs,
  } = activeTab;

  const actionLogs = logs.map((l) => ({
    timestamp: new Date(l.createdAt),
    type: (l.type === 'session' || l.type === 'policy' || l.type === 'human' ? 'command' : l.type === 'error' ? 'error' : l.type === 'ai' ? 'ai' : 'result') as ActionLogEntry['type'],
    message: l.message,
  }));

  const status = session?.status ?? 'idle';
  const isRunning = status === 'running';

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
          <header className="bg-muted p-1">
            <div className="flex flex-wrap justify-end items-center gap-2">
              <CrawlStatusBadge status={status} />
              <CrawlSetupScreen
                setup={setup}
                disabled={isRunning}
                onSetupChange={updateSetup}
                onSave={saveConfig}
              />
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
                      crawlStatus={status}
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
                <ActionLogPanel
                  actions={actionLogs}
                  onClear={clearLogs}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </main>
        </div>
      </TabbedPageLayout>
    </>
  );
}
