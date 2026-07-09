import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TabsContent } from '@/components/ui/tabs';
import { TabbedPageLayout } from '@/components/tabs-layout/tabbed-page-layout';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from '@/components/ui/empty';
import { PlugsConnected, Bug, Terminal, WifiHigh, HardDrive, Browser, ArrowClockwise, Warning } from '@phosphor-icons/react';
import { useInspectExternal } from './hooks/use-inspect-external';
import { NetworkMonitor } from './components/network-monitor';
import { StorageAuditor } from './components/storage-auditor';

export function DebuggerPage() {
  const cdp = useInspectExternal();

  // Active dashboard tabs list
  const tabs = [
    { id: 'network', name: 'Network', closable: false },
    { id: 'storage', name: 'Storage', closable: false },
    { id: 'console', name: 'Console', closable: false },
  ];

  return (
    <TabbedPageLayout
      tabs={tabs}
      activeTabId={cdp.activeTab}
      onTabChange={cdp.setActiveTab}
      className="flex h-full min-h-0 flex-col bg-background"
      contentClassName="flex-1 border rounded-lg overflow-hidden bg-background min-h-0"
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* Top Header info */}
        <header className="flex items-center justify-between gap-3 px-3 py-2 border-b bg-muted/20 shrink-0 select-none flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-sm border bg-background text-primary">
              <Bug className="size-4" />
            </div>

            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-tight">InspectExternal</span>
                {cdp.connectionStatus === 'connected' && cdp.selectedTarget ? (
                  <>
                    <Badge variant="default" className="gap-1 bg-emerald-600 hover:bg-emerald-600 text-white dark:bg-emerald-500">
                      <PlugsConnected className="size-3" />
                      Session: Connected
                    </Badge>
                    <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      CDP Browser: Active
                    </Badge>
                  </>
                ) : cdp.connectionStatus === 'connecting' ? (
                  <>
                    <Badge variant="yellow" className="gap-1 animate-pulse">
                      Connecting...
                    </Badge>
                    <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      CDP Browser: Active
                    </Badge>
                  </>
                ) : (
                  <>
                    <Badge variant="secondary" className="gap-1">
                      Session: Disconnected
                    </Badge>
                    {cdp.isBrowserRunning ? (
                      <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        CDP Browser: Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 border-muted-foreground/30 text-muted-foreground bg-muted-foreground/5">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/45" />
                        CDP Browser: Offline
                      </Badge>
                    )}
                  </>
                )}
              </div>
              {cdp.connectionStatus === 'connected' && cdp.selectedTarget && (
                <p className="text-[11px] text-muted-foreground font-mono truncate max-w-xl">
                  {cdp.selectedTarget.title || 'Untitled Page'} — {cdp.selectedTarget.url}
                </p>
              )}
            </div>
          </div>

          {cdp.connectionStatus === 'connected' && cdp.selectedTarget ? (
            <Button
              variant="outline"
              onClick={cdp.disconnect}
            >
              Disconnect
            </Button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Port:</span>
                <Input
                  type="number"
                  className="w-16 font-mono"
                  value={cdp.port}
                  onChange={(e) => cdp.setPort(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="9223"
                />
              </div>

              <Button
                variant="outline"
                onClick={cdp.openBrowser}
                disabled={cdp.connectionStatus === 'connecting'}
              >
                <Browser />
                Open Browser
              </Button>

              <Button
                variant="outline"
                onClick={cdp.fetchTargets}
                disabled={cdp.connectionStatus === 'connecting'}
              >
                <ArrowClockwise />
                Scan
              </Button>

              <Select
                onValueChange={(val) => {
                  const target = cdp.targets.find(t => t.id === val);
                  if (target) cdp.connect(target);
                }}
                disabled={cdp.connectionStatus === 'connecting' || cdp.targets.length === 0}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={cdp.targets.length === 0 ? "No active tabs" : "Select target..."} />
                </SelectTrigger>
                <SelectContent>
                  {cdp.targets.map(target => (
                    <SelectItem key={target.id} value={target.id}>
                      {target.title || 'Untitled Page'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </header>

        {/* Tab Content Panels */}
        {cdp.connectionStatus !== 'connected' || !cdp.selectedTarget ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 h-full bg-background min-h-0">
            <Empty className="max-w-md border-none">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Bug className="size-6 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>Disconnected from debugger target</EmptyTitle>
                <EmptyDescription>
                  {cdp.scanCount > 0 && cdp.targets.length === 0 ? (
                    <span className="text-amber-600 dark:text-amber-500 font-medium block mt-1">
                      Browser is running on port {cdp.port}, but has no debuggable tabs open. Open a tab (e.g. google.com) in your browser and click "Scan" again.
                    </span>
                  ) : (
                    "Scan for active targets and connect using the toolbar at the top."
                  )}
                </EmptyDescription>
              </EmptyHeader>

              {cdp.error && (
                <EmptyContent className="text-left w-full max-w-lg mt-2">
                  <div className="flex gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs leading-relaxed w-full">
                    <Warning className="size-5 shrink-0 text-rose-500 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="font-semibold text-rose-600 dark:text-rose-400">Discovery Error</p>
                      <p className="opacity-90">{cdp.error}</p>
                      <div className="pt-2 text-[10px] opacity-75">
                        <p className="font-semibold text-[11px] mb-1">How to fix:</p>
                        <p>1. Quit your browser completely.</p>
                        <p>2. Launch from command line with remote debugging enabled:</p>
                        <code className="block bg-rose-950/20 text-rose-400 p-1.5 rounded font-mono mt-1 whitespace-pre-wrap">
                          /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port={cdp.port}
                        </code>
                      </div>
                    </div>
                  </div>
                </EmptyContent>
              )}
            </Empty>
          </div>
        ) : (
          <>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cdp.clearConsole}
                  className="h-8 gap-1 active:scale-[0.97] transition-transform duration-100 ease-out"
                >
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
          </>
        )}
      </div>
    </TabbedPageLayout>
  );
}
