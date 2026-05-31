import * as React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useAppStore } from '@/stores/app';
import { toast } from 'sonner';
import { InterceptQueuePanel } from './components/queue-panel';
import { InterceptRequestPanel } from './components/request-panel';
import { useInterceptPage } from './hooks/use-intercept-page';

export function InterceptPage() {
  useInterceptPage();
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
              Start Proxy
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border bg-background">
        <div className="bg-muted flex-1 min-h-0">
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
      </div>
    </div>
  );
}
