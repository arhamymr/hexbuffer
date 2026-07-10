import { useRef, useMemo, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Trash,
  MagnifyingGlass,
  ArrowUpRight,
  ArrowDownLeft,
  Hourglass,
  Gauge,
  WifiHigh,
  Warning,
  Eye,
} from '@phosphor-icons/react';
import type { NetworkRequest, WebSocketFrame } from '../hooks/use-inspect-external';
import { JsonViewer } from './json-viewer';

interface NetworkMonitorProps {
  requests: NetworkRequest[];
  selectedRequest: NetworkRequest | null;
  selectedRequestId: string | null;
  setSelectedRequestId: (id: string | null) => void;
  getResponseBody: (id: string) => Promise<{ body: string; base64Encoded: boolean }>;
  loadingBodyId: string | null;
  clearNetwork: () => void;
  networkThrottling: string;
  setNetworkThrottling: (profile: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function NetworkMonitor({
  requests,
  selectedRequest,
  selectedRequestId,
  setSelectedRequestId,
  getResponseBody,
  loadingBodyId,
  clearNetwork,
  networkThrottling,
  setNetworkThrottling,
  searchQuery,
  setSearchQuery,
}: NetworkMonitorProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [responseTab, setResponseTab] = useState<'headers' | 'payload' | 'response' | 'websocket'>('headers');

  // Filter requests
  const filteredRequests = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return requests;
    return requests.filter(
      (r) =>
        r.url.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        (r.status && String(r.status).includes(q))
    );
  }, [requests, searchQuery]);

  // Virtualizer for the request ledger list
  const rowVirtualizer = useVirtualizer({
    count: filteredRequests.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 10,
  });

  // Selected Response Body State
  const [bodyData, setBodyData] = useState<{ body: string; base64Encoded: boolean } | null>(null);

  // Fetch body when request selection or tab changes
  useEffect(() => {
    if (selectedRequestId && responseTab === 'response') {
      setBodyData(null);
      getResponseBody(selectedRequestId).then((res) => {
        setBodyData(res);
      });
    }
  }, [selectedRequestId, responseTab, getResponseBody]);

  // Reset tab to headers when switching requests
  useEffect(() => {
    if (selectedRequest) {
      if (selectedRequest.type === 'WebSocket' || selectedRequest.type === 'websocket') {
        setResponseTab('websocket');
      } else {
        setResponseTab('headers');
      }
    }
  }, [selectedRequestId]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Network toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 border-b bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <MagnifyingGlass className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs bg-background"
              placeholder="Filter URL, Method, Status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button variant="outline" size="sm" onClick={clearNetwork} className="h-8 gap-1 px-2.5">
            <Trash className="size-3.5" />
            Clear
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
            <Gauge className="size-3.5" />
            Throttling:
          </div>
          <select
            value={networkThrottling}
            onChange={(e) => setNetworkThrottling(e.target.value)}
            className="h-8 text-xs bg-background border border-input rounded-md px-2.5 py-1 focus:ring-1 focus:ring-primary outline-none"
          >
            <option value="online">Online (No throttling)</option>
            <option value="fast3g">Fast 3G (1.5 Mbps, 100ms)</option>
            <option value="slow3g">Slow 3G (400 Kbps, 400ms)</option>
            <option value="offline">Offline</option>
          </select>

          <Badge variant="secondary" className="h-7 px-2 font-mono text-[10px]">
            {filteredRequests.length} requests
          </Badge>
        </div>
      </div>

      {/* Main Ledger & Detail Workspace */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup orientation="horizontal" className="h-full min-h-0">
          {/* Ledger Table */}
          <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col min-h-0">
            <div className="flex flex-col h-full min-h-0">
              {/* Header Columns */}
              <div className="grid grid-cols-[80px_1fr_65px_80px_70px] px-3 py-1.5 border-b bg-muted/20 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 select-none">
                <span>Method</span>
                <span>URL</span>
                <span className="text-center">Status</span>
                <span>Type</span>
                <span className="text-right">Time</span>
              </div>

              {/* Scrollable list */}
              <div ref={parentRef} className="flex-1 min-h-0 overflow-y-auto bg-background">
                {filteredRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-muted-foreground text-center">
                    <WifiHigh className="size-8 opacity-30 mb-2" />
                    <p className="text-xs font-semibold">No network activity</p>
                    <p className="text-[10px] opacity-75 mt-0.5">
                      Waiting for requests from the connected browser tab...
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const req = filteredRequests[virtualRow.index];
                      const isSelected = selectedRequestId === req.requestId;

                      // Format URL path
                      let path = req.url;
                      try {
                        const parsed = new URL(req.url);
                        path = parsed.pathname + parsed.search;
                        if (path === '/') path = parsed.host;
                      } catch {}

                      return (
                        <button
                          key={virtualRow.key}
                          onClick={() => setSelectedRequestId(req.requestId)}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                          className={`grid grid-cols-[80px_1fr_65px_80px_70px] px-3 items-center text-xs font-mono border-b border-border/40 hover:bg-muted/15 transition-colors text-left focus:outline-none ${
                            isSelected ? 'bg-primary/10 hover:bg-primary/15 border-primary/20' : ''
                          }`}
                        >
                          <span
                            className={`font-bold ${
                              req.method === 'POST'
                                ? 'text-amber-500'
                                : req.method === 'GET'
                                ? 'text-emerald-500'
                                : 'text-blue-500'
                            }`}
                          >
                            {req.method}
                          </span>
                          <span className="truncate text-foreground/90 pr-2" title={req.url}>
                            {path}
                          </span>
                          <span className="text-center font-bold">
                            {req.status ? (
                              <span
                                className={
                                  req.status >= 400
                                    ? 'text-rose-500'
                                    : req.status >= 300
                                    ? 'text-amber-500'
                                    : 'text-emerald-500'
                                }
                              >
                                {req.status}
                              </span>
                            ) : req.errorText ? (
                              <span className="text-rose-500" title={req.errorText}>
                                Failed
                              </span>
                            ) : (
                              <Hourglass className="size-3.5 animate-spin mx-auto text-muted-foreground" />
                            )}
                          </span>
                          <span className="truncate text-muted-foreground text-[10px]">{req.type}</span>
                          <span className="text-right text-muted-foreground/80 text-[10px]">
                            {req.duration ? `${req.duration}ms` : '-'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Details Panel */}
          <ResizablePanel defaultSize={50} minSize={20} className="flex flex-col min-h-0 bg-card">
            {selectedRequest ? (
              <div className="flex flex-col h-full min-h-0 border-l">
                {/* Panel Header */}
                <div className="flex items-center justify-between border-b px-3 py-1.5 bg-muted/30 shrink-0">
                  <span className="text-xs font-semibold truncate max-w-sm text-foreground/85">
                    {selectedRequest.method} {selectedRequest.url}
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setSelectedRequestId(null)}
                    className="h-6 w-6 p-0 hover:bg-muted"
                  >
                    &times;
                  </Button>
                </div>

                {/* Sub-tabs list */}
                <Tabs value={responseTab} onValueChange={(v) => setResponseTab(v as any)} className="flex-1 flex flex-col min-h-0">
                  <div className="px-2 pt-1.5 border-b bg-muted/10 shrink-0">
                    <TabsList className="h-8 bg-muted/40 p-0.5">
                      <TabsTrigger value="headers" className="text-[10px] h-7 px-2.5">Headers</TabsTrigger>
                      <TabsTrigger value="payload" className="text-[10px] h-7 px-2.5">Payload</TabsTrigger>
                      {(selectedRequest.type === 'WebSocket' || selectedRequest.type === 'websocket') ? (
                        <TabsTrigger value="websocket" className="text-[10px] h-7 px-2.5">WebSocket</TabsTrigger>
                      ) : (
                        <TabsTrigger value="response" className="text-[10px] h-7 px-2.5">Response</TabsTrigger>
                      )}
                    </TabsList>
                  </div>

                  {/* Headers Tab Content */}
                  <TabsContent value="headers" className="flex-1 min-h-0 m-0 outline-none">
                    <ScrollArea className="h-full">
                      <div className="p-3.5 space-y-4">
                        {/* Summary */}
                        <div className="space-y-1 text-xs">
                          <h4 className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">General</h4>
                          <div className="grid grid-cols-[100px_1fr] gap-x-2 py-0.5 border-b border-border/40 font-mono">
                            <span className="text-muted-foreground">Request URL:</span>
                            <span className="break-all text-foreground">{selectedRequest.url}</span>
                          </div>
                          <div className="grid grid-cols-[100px_1fr] gap-x-2 py-0.5 border-b border-border/40 font-mono">
                            <span className="text-muted-foreground">Request Method:</span>
                            <span className="text-foreground">{selectedRequest.method}</span>
                          </div>
                          <div className="grid grid-cols-[100px_1fr] gap-x-2 py-0.5 border-b border-border/40 font-mono">
                            <span className="text-muted-foreground">Status Code:</span>
                            <span className="text-foreground font-bold">{selectedRequest.status || 'Pending'}</span>
                          </div>
                        </div>

                        {/* Request Headers */}
                        <div className="space-y-1.5 text-xs">
                          <h4 className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                            Request Headers ({Object.keys(selectedRequest.requestHeaders).length})
                          </h4>
                          <div className="border border-border/60 rounded-lg overflow-hidden bg-background font-mono text-[11px]">
                            {Object.entries(selectedRequest.requestHeaders).map(([key, val]) => (
                              <div key={key} className="grid grid-cols-[150px_1fr] gap-x-3 px-3 py-1 border-b border-border/30 hover:bg-muted/10 last:border-none">
                                <span className="font-semibold text-primary/85 truncate" title={key}>{key}</span>
                                <span className="break-all text-foreground/80">{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Response Headers */}
                        <div className="space-y-1.5 text-xs">
                          <h4 className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
                            Response Headers ({Object.keys(selectedRequest.responseHeaders).length})
                          </h4>
                          {Object.keys(selectedRequest.responseHeaders).length === 0 ? (
                            <p className="text-[10px] text-muted-foreground italic pl-1">No response headers yet.</p>
                          ) : (
                            <div className="border border-border/60 rounded-lg overflow-hidden bg-background font-mono text-[11px]">
                              {Object.entries(selectedRequest.responseHeaders).map(([key, val]) => (
                                <div key={key} className="grid grid-cols-[150px_1fr] gap-x-3 px-3 py-1 border-b border-border/30 hover:bg-muted/10 last:border-none">
                                  <span className="font-semibold text-primary/85 truncate" title={key}>{key}</span>
                                  <span className="break-all text-foreground/80">{val}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* Payload Tab Content */}
                  <TabsContent value="payload" className="flex-1 min-h-0 m-0 outline-none">
                    <ScrollArea className="h-full">
                      <div className="p-3.5 space-y-4">
                        {/* Query String parameters */}
                        <div className="space-y-1.5 text-xs">
                          <h4 className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">Query String Parameters</h4>
                          {(() => {
                            try {
                              const urlObj = new URL(selectedRequest.url);
                              const params = Array.from(urlObj.searchParams.entries());
                              if (params.length === 0) return <p className="text-[10px] text-muted-foreground italic pl-1">No query parameters.</p>;
                              return (
                                <div className="border border-border/60 rounded-lg overflow-hidden bg-background font-mono text-[11px]">
                                  {params.map(([key, val]) => (
                                    <div key={key} className="grid grid-cols-[150px_1fr] gap-x-3 px-3 py-1 border-b border-border/30 hover:bg-muted/10 last:border-none">
                                      <span className="font-semibold text-primary/85 truncate" title={key}>{key}</span>
                                      <span className="break-all text-foreground/85">{val}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            } catch {
                              return <p className="text-[10px] text-rose-500 pl-1">Failed to parse URL query parameters.</p>;
                            }
                          })()}
                        </div>

                        {/* Request POST Body */}
                        <div className="space-y-1.5 text-xs">
                          <h4 className="font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">Request Post Body</h4>
                          {selectedRequest.postData ? (
                            (() => {
                              try {
                                const parsed = JSON.parse(selectedRequest.postData);
                                return (
                                  <div className="border border-border/60 rounded-lg overflow-hidden h-[250px] bg-background">
                                    <JsonViewer data={parsed} />
                                  </div>
                                );
                              } catch {
                                return (
                                  <pre className="p-3 bg-muted/20 border rounded-lg font-mono text-[11px] whitespace-pre-wrap break-all text-foreground/80 max-h-[300px] overflow-y-auto leading-relaxed">
                                    {selectedRequest.postData}
                                  </pre>
                                );
                              }
                            })()
                          ) : (
                            <p className="text-[10px] text-muted-foreground italic pl-1">No post body payload.</p>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* Response Tab Content */}
                  <TabsContent value="response" className="flex-1 min-h-0 m-0 outline-none flex flex-col">
                    {loadingBodyId === selectedRequestId ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
                        <Hourglass className="size-8 animate-spin mb-2" />
                        <span className="text-xs">Fetching response body...</span>
                      </div>
                    ) : bodyData ? (
                      <div className="flex-1 min-h-0 flex flex-col">
                        <div className="px-3 py-1 bg-muted/20 border-b text-[10px] text-muted-foreground flex items-center justify-between shrink-0">
                          <span>
                            {bodyData.base64Encoded ? 'Base64 Encoded Binary Data' : 'Formatted Text Response'}
                          </span>
                          {bodyData.body.length > 100000 && (
                            <span className="text-rose-500 font-semibold">Large body ({Math.round(bodyData.body.length / 1024)} KB)</span>
                          )}
                        </div>
                        <div className="flex-1 min-h-0">
                          {(() => {
                            if (selectedRequest.mimeType.startsWith('image/')) {
                              const src = bodyData.base64Encoded
                                ? `data:${selectedRequest.mimeType};base64,${bodyData.body}`
                                : bodyData.body;
                              return (
                                <div className="h-full flex items-center justify-center p-6 bg-muted/10">
                                  <img src={src} alt="Response Preview" className="max-h-full max-w-full object-contain border rounded shadow-md bg-checkerboard" />
                                </div>
                              );
                            }

                            // Try parsing JSON
                            try {
                              const text = bodyData.base64Encoded ? atob(bodyData.body) : bodyData.body;
                              const parsed = JSON.parse(text);
                              return <JsonViewer data={parsed} />;
                            } catch {
                              // Plain text fall back
                              const text = bodyData.base64Encoded ? atob(bodyData.body) : bodyData.body;
                              return (
                                <ScrollArea className="h-full bg-background font-mono text-[11px] text-foreground/85">
                                  <pre className="p-3 whitespace-pre-wrap break-all leading-relaxed">
                                    {text || <span className="text-muted-foreground italic">(Empty Response Body)</span>}
                                  </pre>
                                </ScrollArea>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
                        <Eye className="size-8 opacity-30 mb-2" />
                        <span className="text-xs">No response loaded. Click to request.</span>
                      </div>
                    )}
                  </TabsContent>

                  {/* WebSocket Frame Ledger */}
                  <TabsContent value="websocket" className="flex-1 min-h-0 m-0 outline-none flex flex-col">
                    <div className="flex-1 min-h-0 flex flex-col">
                      {/* Frame columns header */}
                      <div className="grid grid-cols-[24px_60px_60px_1fr_60px] px-3 py-1.5 border-b bg-muted/20 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 select-none">
                        <span></span>
                        <span>Opcode</span>
                        <span className="text-right">Size</span>
                        <span className="pl-3">Data</span>
                        <span className="text-right">Time</span>
                      </div>

                      <ScrollArea className="flex-1 min-h-0">
                        {selectedRequest.webSocketFrames.length === 0 ? (
                          <div className="p-6 text-center text-xs text-muted-foreground">
                            Waiting for WebSocket data frames...
                          </div>
                        ) : (
                          <div className="divide-y divide-border/30 font-mono text-xs">
                            {selectedRequest.webSocketFrames.map((frame, idx) => {
                              const isIncoming = frame.direction === 'receive';
                              const opcodes: Record<number, string> = {
                                1: 'Text',
                                2: 'Binary',
                                8: 'Close',
                                9: 'Ping',
                                10: 'Pong',
                              };
                              const opcodeText = opcodes[frame.opcode] || `Op:${frame.opcode}`;

                              // Format timestamp to hh:mm:ss.l
                              const timeStr = new Date(frame.timestamp).toLocaleTimeString([], {
                                hour12: false,
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              });

                              return (
                                <div
                                  key={idx}
                                  className={`grid grid-cols-[24px_60px_60px_1fr_60px] px-3 py-1.5 items-center hover:bg-muted/10 ${
                                    isIncoming ? 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' : 'bg-blue-500/5 text-blue-600 dark:text-blue-400'
                                  }`}
                                >
                                  <span title={isIncoming ? 'Incoming' : 'Outgoing'}>
                                    {isIncoming ? (
                                      <ArrowDownLeft className="size-3.5" />
                                    ) : (
                                      <ArrowUpRight className="size-3.5" />
                                    )}
                                  </span>
                                  <span className="font-semibold text-[10px] uppercase">{opcodeText}</span>
                                  <span className="text-right text-[10px] opacity-75">{frame.size} B</span>
                                  <span className="truncate pl-3 text-foreground/90 font-mono" title={frame.payloadData}>
                                    {frame.payloadData}
                                  </span>
                                  <span className="text-right text-[10px] text-muted-foreground/80">{timeStr}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-muted-foreground text-center">
                <WifiHigh className="size-8 opacity-30 mb-2" />
                <p className="text-xs font-semibold">No request selected</p>
                <p className="text-[10px] opacity-75 mt-0.5">Select a row on the left ledger to audit transaction details</p>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
