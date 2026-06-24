import { Button } from '@/components/ui/button';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { InfoIcon } from 'lucide-react';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { InvokerConfigDialog } from './components/invoker-config';
import { InvokerFilters } from './components/filters';
import { InvokerPayloadDialog } from './components/payload-dialog';
import { InvokerProgress } from './components/progress';
import { InvokerResultDrawer } from './components/result-drawer';
import { InvokerResultsPanel } from './components/results-panel';
import { useInvokerPage } from './hooks/use-page';

export function InvokerPage() {
  const page = useInvokerPage();

  if (!page.activeTab) {
    return null;
  }

  return (
    <>
      {!page.invokerSafetyAlertDismissed && (
        <div className='p-2'>
          <Alert variant="default" className="min-h-12 shrink-0 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
            <InfoIcon className='!text-amber-600' />
            <AlertDescription className='text-amber-600'>
              Only run invoker tests against systems you own or are explicitly authorized to assess. Unauthorized attempts can be illegal and may trigger account lockouts.
            </AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                aria-label="Dismiss safety notice"
                onClick={() => page.setInvokerSafetyAlertDismissed(true)}
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
        contentClassName="flex-1 border rounded-lg overflow-hidden bg-background min-h-0"
      >
        <div className="flex h-full min-h-0 flex-col">
          <ResizablePanelGroup
            orientation="horizontal"
            className="bg-muted min-h-0 flex-1"
          >
            <ResizablePanel defaultSize={50} minSize={20}>
              <div className="flex min-h-0 flex-col h-full">
                <InvokerProgress />
                <div className="min-h-0 flex-1 p-2">
                  <InvokerConfigDialog isRunning={page.isRunning} progress={page.progress} startBlockedReason={page.startBlockedReason} />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={20}>
              <div className="flex min-h-0 flex-col h-full">
                <div className="flex min-h-0 flex-1 flex-col p-2">
                  <InvokerFilters />
                  <div className="min-h-0 flex-1">
                    <InvokerResultsPanel />
                  </div>
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>

          <InvokerResultDrawer />
          <InvokerPayloadDialog />
        </div>
      </TabbedPageLayout>
    </>
  );
}

