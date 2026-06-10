'use client';

import { useCallback, useMemo, useState } from 'react';
import { Plug, Unplug, Loader2, Circle, RotateCw, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { useInspectorPage } from './hooks/use-inspector-page';
import { ConsolePanel } from './components/console-panel';
import { LogDetailPanel } from './components/log-detail-panel';
import { PagesSidebar } from './components/pages-sidebar';
import { NetworkPanel } from './components/network-panel';
import { NetworkDetail } from './components/network-detail';
import { StoragePanel } from './components/storage-panel';
import { useInspectorStore } from '@/stores/inspector';
import { useAppStore, getEffectiveProxyPort } from '@/stores/app';
import {
  connectInspectorCdp,
  disconnectInspectorCdp,
  resetInspectorBrowser,
} from './api';
import { DEFAULT_DEBUGGING_PORT } from './constants';
import type { InspectorConsoleLog } from './types';
import { toast } from 'sonner';

const TABS = [
  { id: 'console', label: 'Console' },
  { id: 'network', label: 'Network' },
  { id: 'storage', label: 'Storage' },
] as const;

export function InspectorPage() {
  useInspectorPage();

  const [isConnecting, setIsConnecting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isConnected = useInspectorStore((state) => state.isConnected);
  const setConnected = useInspectorStore((state) => state.setConnected);
  const logs = useInspectorStore((state) => state.logs);
  const selectedLogId = useInspectorStore((state) => state.selectedLogId);
  const setSelectedLogId = useInspectorStore((state) => state.setSelectedLogId);
  const activeTab = useInspectorStore((state) => state.activeTab);
  const setActiveTab = useInspectorStore((state) => state.setActiveTab);
  const networkEntries = useInspectorStore((state) => state.networkEntries);
  const selectedNetworkId = useInspectorStore((state) => state.selectedNetworkId);
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

  const handleReset = useCallback(async () => {
    setIsResetting(true);
    try {
      await disconnectInspectorCdp();
      setConnected(false);
      await resetInspectorBrowser(DEFAULT_DEBUGGING_PORT, activeProxyPort);
      await connectInspectorCdp(DEFAULT_DEBUGGING_PORT);
      toast.success('Browser reset');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to reset browser';
      toast.error(msg);
    } finally {
      setIsResetting(false);
    }
  }, [setConnected, activeProxyPort]);

  const selectedLog = useMemo(
    () => logs.find((l) => l.id === selectedLogId) ?? null,
    [logs, selectedLogId]
  );

  const selectedNetwork = useMemo(
    () => networkEntries.find((e) => e.id === selectedNetworkId) ?? null,
    [networkEntries, selectedNetworkId]
  );

  const handleSelectLog = useCallback((log: InspectorConsoleLog) => {
    setSelectedLogId(log.id);
  }, [setSelectedLogId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b bg-background px-3 py-1.5">
        <Button
          variant="ghost"
          size="xs"
          className="h-6 w-6 p-0"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Toggle pages sidebar"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="size-3.5" />
          ) : (
            <PanelLeftOpen className="size-3.5" />
          )}
        </Button>

        {isConnected ? (
          <Circle className="size-2.5 fill-green-500 text-green-500 shrink-0" />
        ) : (
          <Circle className="size-2.5 text-muted-foreground shrink-0" />
        )}
        <span className="text-xs text-muted-foreground min-w-0 hidden sm:inline">
          {isConnected
            ? 'Listening'
            : `Browser on :${activeProxyPort}`}
        </span>

        <div className="flex items-center gap-1 ml-2">
          {TABS.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="xs"
              className="h-6 text-xs"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {isConnected ? (
            <>
              <Button
                variant="outline"
                size="xs"
                className="h-7"
                onClick={handleReset}
                disabled={isResetting}
              >
                <RotateCw className={`size-3.5 mr-1 ${isResetting ? 'animate-spin' : ''}`} />
                Reset
              </Button>
              <Button
                variant="outline"
                size="xs"
                className="h-7"
                onClick={handleDisconnect}
              >
                <Unplug className="size-3.5 mr-1" />
                Stop
              </Button>
            </>
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

      <main className="min-h-0 flex-1">
        <ResizablePanelGroup
          key={sidebarOpen ? 'open' : 'closed'}
          orientation="horizontal"
          className="min-h-0"
        >
          {sidebarOpen && (
            <ResizablePanel defaultSize={20} minSize={12}>
              <div className="h-full border-r flex flex-col min-w-0">
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-2 py-1.5 border-b bg-muted">
                  Pages
                </div>
                <PagesSidebar />
              </div>
            </ResizablePanel>
          )}
          {sidebarOpen && <ResizableHandle withHandle />}

          <ResizablePanel defaultSize={20} minSize={20}>
            {activeTab === 'console' ? (
              <ConsolePanel selectedLogId={selectedLogId} onSelectLog={handleSelectLog} />
            ) : activeTab === 'network' ? (
              <NetworkPanel />
            ) : (
              <StoragePanel />
            )}
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={20} minSize={20}>
            {activeTab === 'console' ? (
              <LogDetailPanel log={selectedLog} />
            ) : activeTab === 'network' ? (
              <NetworkDetail entry={selectedNetwork} />
            ) : (
              <LogDetailPanel log={selectedLog} />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
