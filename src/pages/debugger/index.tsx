import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TabsContent } from '@/components/ui/tabs';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { PlugsConnected, Bug, Terminal, WifiHigh, HardDrive } from '@phosphor-icons/react';
import { useInspectExternal } from './hooks/use-inspect-external';
import { TargetSelector } from './components/target-selector';
import { NetworkMonitor } from './components/network-monitor';
import { StorageAuditor } from './components/storage-auditor';

export function DebuggerPage() {
  const cdp = useInspectExternal();

  // If disconnected, show connection & target discovery UI
  if (cdp.connectionStatus === 'disconnected' || !cdp.selectedTarget) {
    return (
      <TargetSelector
        port={cdp.port}
        setPort={cdp.setPort}
        targets={cdp.targets}
        connectionStatus={cdp.connectionStatus}
        error={cdp.error}
        fetchTargets={cdp.fetchTargets}
        openBrowser={cdp.openBrowser}
        connect={cdp.connect}
      />
    );
  }

  // Active dashboard tabs list
  const tabs = [
    { id: 'network', name: 'Network', closable: false },
    { id: 'storage', name: 'Storage', closable: false },
    { id: 'console', name: 'Console', closable: false },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Top Header info */}
      <header className="bg-muted px-4 py-2 border-b flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary border border-primary/25">
            <Bug className="size-4" />
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wide uppercase">InspectExternal</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 gap-1 font-medium">
                <PlugsConnected className="size-3" />
                Connected
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono truncate max-w-xl">
              {cdp.selectedTarget.title || 'Untitled Page'} — {cdp.selectedTarget.url}
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={cdp.disconnect} className="h-8 text-xs">
          Disconnect
        </Button>
      </header>

      {/* Main Dashboard with Sub-tabs */}
      <div className="flex-1 min-h-0">
        <TabbedPageLayout
          tabs={tabs}
          activeTabId={cdp.activeTab}
          onTabChange={cdp.setActiveTab}
          className="flex flex-col h-full min-h-0"
          contentClassName="flex-1 border rounded-lg overflow-hidden bg-background min-h-0"
        >
          {/* Network monitor panel */}
          <TabsContent value="network" className="flex-1 min-h-0 m-0 outline-none">
            <NetworkMonitor
              requests={cdp.networkRequests}
              selectedRequest={cdp.selectedRequest}
              selectedRequestId={cdp.selectedRequestId}
              setSelectedRequestId={cdp.setSelectedRequestId}
              getResponseBody={cdp.getResponseBody}
              loadingBodyId={cdp.loadingBodyId}
              clearNetwork={cdp.clearNetwork}
              networkThrottling={cdp.networkThrottling}
              setNetworkThrottling={cdp.setNetworkThrottling}
              searchQuery={cdp.searchQuery}
              setSearchQuery={cdp.setSearchQuery}
            />
          </TabsContent>

          {/* Storage auditor panel */}
          <TabsContent value="storage" className="flex-1 min-h-0 m-0 outline-none">
            <StorageAuditor
              cookies={cdp.cookies}
              localStorageItems={cdp.localStorageItems}
              sessionStorageItems={cdp.sessionStorageItems}
              refreshStorage={cdp.refreshStorage}
              deleteCookie={cdp.deleteCookie}
              deleteStorageItem={cdp.deleteStorageItem}
              clearStorage={cdp.clearStorage}
              targetUrl={cdp.selectedTarget.url}
            />
          </TabsContent>

          {/* Console logs panel */}
          <TabsContent value="console" className="flex-1 min-h-0 m-0 outline-none flex flex-col bg-background">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Console logs
              </span>
              <Button variant="outline" size="sm" onClick={cdp.clearConsole} className="h-8 gap-1">
                Clear Console
              </Button>
            </div>

            <ScrollArea className="flex-1 p-3 font-mono text-[11px] leading-relaxed bg-black/5 dark:bg-black/20">
              {cdp.consoleLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-[200px]">
                  <Terminal className="size-8 opacity-30 mb-2" />
                  <p>No console messages captured yet.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {cdp.consoleLogs.map((log) => {
                    const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    let levelColor = 'text-foreground/80';
                    if (log.level === 'error') levelColor = 'text-rose-500 bg-rose-500/5 px-1 py-0.5 rounded';
                    if (log.level === 'warning') levelColor = 'text-amber-500 bg-amber-500/5 px-1 py-0.5 rounded';
                    if (log.level === 'info') levelColor = 'text-sky-400';
                    if (log.level === 'debug') levelColor = 'text-violet-400';

                    return (
                      <div key={log.id} className={`flex items-start gap-3 py-0.5 border-b border-border/10 last:border-none ${levelColor}`}>
                        <span className="text-[10px] text-muted-foreground shrink-0 select-none">
                          [{timeStr}]
                        </span>
                        <span className="font-semibold select-none shrink-0 w-12 uppercase text-[10px] tracking-wider opacity-75">
                          {log.level}
                        </span>
                        <span className="break-all whitespace-pre-wrap flex-1">{log.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </TabbedPageLayout>
      </div>
    </div>
  );
}
