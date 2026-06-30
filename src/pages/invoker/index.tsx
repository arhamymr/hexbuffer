import { Button } from '@/components/ui/button';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Info, PlayIcon, SquareIcon } from '@phosphor-icons/react';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { InvokerConfigDialog } from './components/invoker-config';
import { InvokerPayloadDialog } from './components/payload-dialog';
import { InvokerProgress } from './components/progress';
import { InvokerResultDrawer } from './components/result-drawer';
import { InvokerResultsPanel } from './components/results-panel';
import { useInvokerPage } from './hooks/use-page';
import { startInvokerUiAttack, stopInvokerUiAttack } from '@/triggers';

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
            <Info className='!text-amber-600' />
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
          <div className="flex bg-muted min-h-0 flex-1">
            <div className="flex-1 flex min-h-0 flex-col h-full">
              <InvokerProgress />
              <div className="flex items-center gap-2 px-2 py-1.5 border-b shrink-0">
                {page.isRunning ? (
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={stopInvokerUiAttack}>
                    <SquareIcon className="size-3" /> Stop
                  </Button>
                ) : (
                  <Button size="sm" className="h-7 text-xs" onClick={startInvokerUiAttack} disabled={!!page.startBlockedReason}>
                    <PlayIcon className="size-3" /> Start
                  </Button>
                )}
              </div>
              <div className="min-h-0 flex-1 p-2">
                <InvokerConfigDialog isRunning={page.isRunning} progress={page.progress} startBlockedReason={page.startBlockedReason} />
              </div>
            </div>
            <div className="flex-1 flex min-h-0 flex-col h-full">
              <div className="flex min-h-0 flex-1 flex-col p-2">
                <div className="min-h-0 flex-1">
                  <InvokerResultsPanel />
                </div>
              </div>
            </div>
          </div>

          <InvokerResultDrawer />
          <InvokerPayloadDialog />
        </div>
      </TabbedPageLayout>
    </>
  );
}

