import * as React from 'react';
import { Alert, AlertDescription, AlertAction } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { useAppStore } from '@/stores/app';
import { toast } from 'sonner';
import { InterceptQueuePanel } from './components/queue-panel';
import { InterceptRequestPanel } from './components/request-panel';
import { useInterceptPage } from './hooks/use-intercept-page';
import { useInterceptStore } from './state/intercept-store';

export function InterceptPage() {
  useInterceptPage();
  const proxyStatus = useAppStore((state) => state.proxyStatus);
  const startProxy = useAppStore((state) => state.startProxy);
  const tabs = useInterceptStore((state) => state.tabs);
  const activeTabId = useInterceptStore((state) => state.activeTabId);
  const setActiveTabId = useInterceptStore((state) => state.setActiveTabId);
  const addTab = useInterceptStore((state) => state.addTab);
  const renameTab = useInterceptStore((state) => state.renameTab);
  const closeTab = useInterceptStore((state) => state.closeTab);
  const closeTabsToLeft = useInterceptStore((state) => state.closeTabsToLeft);
  const closeTabsToRight = useInterceptStore((state) => state.closeTabsToRight);
  const [isStarting, setIsStarting] = React.useState(false);

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
<Alert variant="default" className="min-h-11 items-center shrink-0 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
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

        <TabbedPageLayout
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={setActiveTabId}
          onTabAdd={addTab}
          onTabRename={renameTab}
          onTabClose={(tabId) => void closeTab(tabId)}
          onCloseTabsToLeft={(tabId) => void closeTabsToLeft(tabId)}
          onCloseTabsToRight={(tabId) => void closeTabsToRight(tabId)}
          className="flex min-h-0 h-full flex-1 flex-col"
          contentClassName="flex-1 rounded-lg border min-h-0 overflow-hidden"
        >
          <div className="h-full min-h-0">
            <ResizablePanelGroup orientation="horizontal" className="min-h-0">
              <ResizablePanel defaultSize={50} minSize={20}>
                <InterceptRequestPanel />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} minSize={20}>
                <InterceptQueuePanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </TabbedPageLayout>
    </>
  );
}
