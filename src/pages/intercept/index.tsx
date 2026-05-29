import * as React from 'react';
import { AlertTriangle, Loader2, Power } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/app';
import { toast } from 'sonner';
import { InterceptBypassPanel } from './components/intercept-bypass-panel';
import { InterceptQueuePanel } from './components/intercept-queue-panel';
import { InterceptRequestPanel } from './components/intercept-request-panel';
import { useInterceptPage } from './hooks/use-intercept-page';

export function InterceptPage() {
  const {
    status,
    requests,
    selectedRequestId,
    rawRequest,
    isBusy,
    isRefreshing,
    bypassPatterns,
    setSelectedRequestId,
    setRawRequest,
    refresh,
    toggleIntercept,
    forwardSelectedRequest,
    dropSelectedRequest,
    addBypassPattern,
    removeBypassPattern,
    bypassHostAndForward,
  } = useInterceptPage();
  const proxyStatus = useAppStore((state) => state.proxyStatus);
  const startProxy = useAppStore((state) => state.startProxy);
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
    <div className="flex h-full min-h-0 flex-col">
      {proxyStatus !== 'connected' && (
        <Alert variant="default" className="mb-2 items-center shrink-0 border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertDescription className="flex items-center gap-2 text-amber-700 dark:text-amber-200/70">
            <span>Start the proxy to intercept HTTP requests.</span>
            <Button
              variant="outline"
              size="xs"
              className="h-6 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-500/50 dark:text-amber-300 dark:hover:bg-amber-500/20"
              onClick={handleStartProxy}
              disabled={isStarting || proxyStatus === 'starting'}
            >
              {isStarting || proxyStatus === 'starting' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Power className="h-3 w-3" />
              )}
              Start Proxy
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border bg-background">
      <div className="bg-muted grid min-h-0 flex-1 grid-cols-2 gap-0">
        <div className="min-h-0 border-r">
          <InterceptRequestPanel
            status={status}
            rawRequest={rawRequest}
            hasSelection={Boolean(selectedRequestId)}
            onRawRequestChange={setRawRequest}
            onToggleIntercept={toggleIntercept}
            bypassPanel={
              <InterceptBypassPanel
                patterns={bypassPatterns}
                disabled={status?.mode !== 'Enabled'}
                onAdd={addBypassPattern}
                onRemove={removeBypassPattern}
              />
            }
          />
        </div>
        <div className="min-h-0">
          <InterceptQueuePanel
            status={status}
            requests={requests}
            selectedRequestId={selectedRequestId}
            isBusy={isBusy}
            isRefreshing={isRefreshing}
            onSelectRequest={setSelectedRequestId}
            onForward={forwardSelectedRequest}
            onDrop={dropSelectedRequest}
            onRefresh={refresh}
            onBypassHost={bypassHostAndForward}
          />
        </div>
      </div>
      </div>
    </div>
  );
}
