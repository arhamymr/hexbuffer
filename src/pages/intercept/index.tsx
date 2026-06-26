import { Alert, AlertDescription, AlertAction } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { useProxyStart } from '@/hooks/use-proxy-start';
import { InterceptQueuePanel } from './components/queue-panel';
import { InterceptRequestPanel } from './components/request-panel';
import { useInterceptPage } from './hooks/use-intercept-page';

export function InterceptPage() {
  const page = useInterceptPage();
  const { proxyStatus, isStarting, handleStartProxy } = useProxyStart();

  return (
    <>
      {proxyStatus !== 'connected' && (
        <div className='p-2'>
          <Alert variant="default" className="min-h-11 items-center shrink-0 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertDescription className="flex items-center gap-2 text-amber-700 dark:text-amber-200/70">
              <span>Start the proxy to intercept HTTP requests.</span>
            </AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                size="xs"
                onClick={handleStartProxy}
                disabled={isStarting || proxyStatus === 'starting'}
              >
                Start Proxy
              </Button>
            </AlertAction>
          </Alert>
        </div>
      )}

      <TabbedPageLayout
        tabs={page.tabs}
        activeTabId={page.activeTabId}
        onTabChange={page.setActiveTabId}
        onTabAdd={page.addTab}
        onTabRename={page.renameTab}
        onTabClose={(tabId) => void page.closeTab(tabId)}
        onCloseTabsToLeft={(tabId) => void page.closeTabsToLeft(tabId)}
        onCloseTabsToRight={(tabId) => void page.closeTabsToRight(tabId)}
        className="flex min-h-0 h-full flex-1 flex-col"
        contentClassName="flex-1 rounded-lg border min-h-0 overflow-hidden"
      >
        <div className="h-full min-h-0 flex">
          <div className="flex-1 min-w-0">
            <InterceptRequestPanel />
          </div>
          <div className="flex-1 min-w-0 border-l">
            <InterceptQueuePanel />
          </div>
        </div>
      </TabbedPageLayout>
    </>
  );
}

