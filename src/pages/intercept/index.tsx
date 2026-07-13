import * as React from 'react';
import { PauseIcon, PlayIcon, PlusIcon, XIcon } from '@phosphor-icons/react';
import { Alert, AlertDescription, AlertAction } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { useProxyStart } from '@/hooks/use-proxy-start';
import { InterceptQueuePanel } from './components/queue-panel';
import { InterceptRequestPanel } from './components/request-panel';
import { useInterceptPage } from './hooks/use-intercept-page';
import { useInterceptStore } from './state/intercept-store';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

export function InterceptPage() {
  const page = useInterceptPage();
  const { proxyStatus, isStarting, handleStartProxy } = useProxyStart();

  const status = useInterceptStore((state) => state.status);
  const requests = useInterceptStore((state) => state.requests);
  const tabs = useInterceptStore((state) => state.tabs);
  const activeTabId = useInterceptStore((state) => state.activeTabId);
  const toggleIntercept = useInterceptStore((state) => state.toggleIntercept);
  const addCaptureHost = useInterceptStore((state) => state.addCaptureHost);
  const removeCaptureHost = useInterceptStore((state) => state.removeCaptureHost);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const patterns = activeTab?.captureHosts ?? [];
  const activeRequests = requests.filter((request) => request.tab_id === activeTabId);
  const isEnabled = status?.mode === 'Enabled';

  // ponytail: inline filter input state for simple and reactive capture filter addition
  const [filterValue, setFilterValue] = React.useState('');

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
        <div className="h-full min-h-0 flex flex-col">
          {/* Header Toolbar */}
          <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/20 px-3 gap-4">
            {/* Left: Intercept Status & Toggle */}
            <div className="flex items-center gap-3">
              <Button
                variant={isEnabled ? 'default' : 'outline'}
                size="xs"
                onClick={() => void toggleIntercept(!isEnabled)}
              >
                {isEnabled ? (
                  <>
                    <PauseIcon className="size-3.5" />
                    <span>Intercept On</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="size-3.5" />
                    <span>Intercept Off</span>
                  </>
                )}
              </Button>
              {activeRequests.length > 0 && (
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/60">
                  {activeRequests.length} paused req{activeRequests.length === 1 ? '' : 's'}
                </span>
              )}
            </div>

            {/* Right: Capture Hosts Filters */}
            <div className="flex items-center gap-2 max-w-[60%] min-w-0">
              <span className="text-[10px] font-mono text-muted-foreground shrink-0">Capture Hosts:</span>
              <div className="flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] py-0.5 max-w-[300px]">
                {patterns.length > 0 ? (
                  patterns.map((pattern) => (
                    <Badge
                      key={pattern}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1 text-[11px] h-5 rounded-sm whitespace-nowrap animate-in fade-in zoom-in-95 duration-150"
                    >
                      <span className="truncate max-w-[120px]">{pattern}</span>
                      <button
                        type="button"
                        onClick={() => removeCaptureHost(pattern)}
                        className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-muted-foreground/20"
                        aria-label={`Remove ${pattern}`}
                      >
                        <XIcon className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-[10px] text-muted-foreground/60 italic whitespace-nowrap">none (capturing nothing)</span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Input
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const trimmed = filterValue.trim();
                      if (trimmed) {
                        addCaptureHost(trimmed);
                        setFilterValue('');
                      }
                    }
                  }}
                  placeholder="Add host..."
                  className="h-6 w-36 text-[11px] px-2 py-1 rounded-sm"
                />
                <Button
                  variant="outline"
                  size="xs"
                  className="h-6"
                  onClick={() => {
                    const trimmed = filterValue.trim();
                    if (trimmed) {
                      addCaptureHost(trimmed);
                      setFilterValue('');
                    }
                  }}
                  disabled={!filterValue.trim()}
                >
                  <PlusIcon className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Main workspace layout */}
          <div className="flex-1 min-h-0">
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel defaultSize={35} minSize={20}>
                <InterceptQueuePanel />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={65} minSize={30}>
                <InterceptRequestPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      </TabbedPageLayout>
    </>
  );
}

