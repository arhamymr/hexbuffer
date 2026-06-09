'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plug, Unplug, Loader2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useInspectorPage } from './hooks/use-inspector-page';
import { ConsolePanel } from './components/console-panel';
import { LogDetailPanel } from './components/log-detail-panel';
import { useInspectorStore } from '@/stores/inspector';
import { useAppStore, getEffectiveProxyPort } from '@/stores/app';
import { connectInspectorCdp, disconnectInspectorCdp } from './api';
import { DEFAULT_DEBUGGING_PORT } from './constants';
import type { InspectorConsoleLog } from './types';
import { toast } from 'sonner';

export function InspectorPage() {
  useInspectorPage();

  const [isConnecting, setIsConnecting] = useState(false);
  const isConnected = useInspectorStore((state) => state.isConnected);
  const setConnected = useInspectorStore((state) => state.setConnected);
  const logs = useInspectorStore((state) => state.logs);
  const selectedLogId = useInspectorStore((state) => state.selectedLogId);
  const setSelectedLogId = useInspectorStore((state) => state.setSelectedLogId);
  const proxyPort = useAppStore((state) => state.proxyPort);
  const proxyDefaultPort = useAppStore((state) => state.proxyDefaultPort);
  const activeProxyPort = getEffectiveProxyPort({ proxyPort, proxyDefaultPort });

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      await connectInspectorCdp(DEFAULT_DEBUGGING_PORT);
      toast.success('Connected to browser DevTools');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to connect';
      toast.error(msg);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectInspectorCdp();
      setConnected(false);
      toast.success('Disconnected from browser');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to disconnect';
      toast.error(msg);
    }
  }, [setConnected]);

  const selectedLog = useMemo(
    () => logs.find((l) => l.id === selectedLogId) ?? null,
    [logs, selectedLogId]
  );

  const handleSelectLog = useCallback((log: InspectorConsoleLog) => {
    setSelectedLogId(log.id);
  }, [setSelectedLogId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b bg-background px-4 py-2">
        {isConnected ? (
          <Circle className="size-2.5 fill-green-500 text-green-500 shrink-0" />
        ) : (
          <Circle className="size-2.5 text-muted-foreground shrink-0" />
        )}
        <span className="text-xs text-muted-foreground min-w-0">
          {isConnected
            ? 'Listening for console output from the Inspector browser.'
            : `Browser on port ${activeProxyPort}. Click Start Listening to begin capturing console output.`}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {isConnected ? (
            <Button
              variant="outline"
              size="xs"
              className="h-7"
              onClick={handleDisconnect}
            >
              <Unplug className="size-3.5 mr-1" />
              Stop Listening
            </Button>
          ) : (
            <Button
              size="xs"
              className="h-7"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="size-3.5 mr-1 animate-spin" />
              ) : (
                <Plug className="size-3.5 mr-1" />
              )}
              {isConnecting ? 'Connecting...' : 'Start Listening'}
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <ResizablePanelGroup orientation="horizontal" className="min-h-0">
          <ResizablePanel defaultSize={55} minSize={30}>
            <ConsolePanel selectedLogId={selectedLogId} onSelectLog={handleSelectLog} />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={20}>
            <LogDetailPanel log={selectedLog} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
