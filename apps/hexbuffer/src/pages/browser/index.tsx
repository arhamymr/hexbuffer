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
import { CrawlStatusBadge } from '@/components/status-badge';
import { useProxyStart } from '@/hooks/use-proxy-start';
import { useBrowserAutomationPage } from './hooks/use-page';

export function BrowserAutomationPage() {
  const { proxyStatus, isStarting, handleStartProxy } = useProxyStart();
  const page = useBrowserAutomationPage();

  if (!page.activeTab) {
    return null;
  }

  const { setup, expandedPageIds, search } = page.activeTab;

  return (
    <>
      {proxyStatus !== 'connected' && (
        <div className="p-2">
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

      {!page.browserAutomationSafetyAlertDismissed && (
        <div className="p-2">
          <Alert variant="default" className="min-h-12 mb-0 shrink-0 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
            <InfoIcon className="!text-amber-600 shrink-0" />
            <AlertDescription className="text-amber-600">
              The browser automation will interact with external websites. Only scan targets you own or are authorized to assess. Unauthorized scanning may violate terms of service or applicable laws.
            </AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                aria-label="Dismiss safety notice"
                onClick={() => page.setBrowserAutomationSafetyAlertDismissed(true)}
              >
                Dismiss
              </Button>
            </AlertAction>
          </Alert>
        </div>
      )}

      <TabbedPageLayout
        tabs={page.tabs}
        activeTabId={page.activeTabId}
        onTabChange={page.setActiveTabId}
        onTabRename={page.renameTab}
        onTabClose={page.closeTab}
        contentClassName="flex-1 border rounded-md overflow-hidden bg-background min-h-0"
      >
        <div className="flex h-full min-h-0 flex-col bg-background">
          <header className="bg-muted p-1">
            <div className="flex flex-wrap justify-end items-center gap-2">
              <CrawlStatusBadge status={page.status} />
              <CrawlSetupScreen
                setup={setup}
                disabled={page.isRunning}
                onSetupChange={page.updateSetup}
                onSave={page.saveConfig}
              />
            </div>
          </header>

          <main className="min-h-0 flex-1">
            <ResizablePanelGroup orientation="vertical" className="min-h-0">
              <ResizablePanel defaultSize={60} minSize={20}>
                <ResizablePanelGroup orientation="horizontal" className="min-h-0">
                  <ResizablePanel defaultSize={20} minSize={20}>
                    <CrawlTreePanel
                      nodes={page.crawlTree}
                      selectedPageId={page.selectedPage?.id ?? null}
                      expandedPageIds={expandedPageIds}
                      searchQuery={search}
                      crawlStatus={page.status}
                    />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={20} minSize={20}>
                    <PageDetailPanel page={page.selectedPage} searchQuery={search} />
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={20} minSize={20}>
                    <AiInsightsPanel
                      insights={page.filteredInsights}
                      interestingPages={page.interestingPages}
                      searchQuery={search}
                    />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={14}>
                <ActionLogPanel actions={page.actionLogs} onClear={page.clearLogs} />
              </ResizablePanel>
            </ResizablePanelGroup>
          </main>
        </div>
      </TabbedPageLayout>
    </>
  );
}

