import { Plug, Unplug, Loader2, Circle, RotateCw, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ConsolePanel } from './console-panel';
import { LogDetailPanel } from './log-detail-panel';
import { PagesSidebar } from './pages-sidebar';
import { NetworkPanel } from './network-panel';
import { NetworkDetail } from './network-detail';
import { StoragePanel } from './storage-panel';
import { TABS } from '../constants';
import type { InspectorConsoleLog, InspectorNetworkEntry, InspectorTab } from '../types';

interface InspectorViewProps {
  isConnected: boolean;
  isConnecting: boolean;
  isResetting: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeTab: InspectorTab;
  setActiveTab: (tab: InspectorTab) => void;
  activeProxyPort: number;
  selectedLogId: string | null;
  selectedLog: InspectorConsoleLog | null;
  selectedNetwork: InspectorNetworkEntry | null;
  onSelectLog: (log: InspectorConsoleLog) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onReset: () => void;
}

export function InspectorView({
  isConnected,
  isConnecting,
  isResetting,
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  setActiveTab,
  activeProxyPort,
  selectedLogId,
  selectedLog,
  selectedNetwork,
  onSelectLog,
  onConnect,
  onDisconnect,
  onReset,
}: InspectorViewProps) {
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
                onClick={onReset}
                disabled={isResetting}
              >
                <RotateCw className={`size-3.5 mr-1 ${isResetting ? 'animate-spin' : ''}`} />
                Reset
              </Button>
              <Button
                variant="outline"
                size="xs"
                className="h-7"
                onClick={onDisconnect}
              >
                <Unplug className="size-3.5 mr-1" />
                Stop
              </Button>
            </>
          ) : (
            <Button
              size="xs"
              className="h-7"
              onClick={onConnect}
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
              <ConsolePanel selectedLogId={selectedLogId} onSelectLog={onSelectLog} />
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
