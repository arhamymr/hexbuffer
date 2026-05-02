"use client";

import { useState, useMemo } from 'react';
import { Bug, Trash2, ChevronRight, ChevronDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { useTrafficStore } from '@/stores/trafficStore';
import type { DebugLog, ProxyLogEntry } from '@/hooks/useDebugLogs';

function getStatusColor(status: number | null | undefined) {
  if (!status) return 'bg-gray-500';
  if (status >= 200 && status < 300) return 'bg-green-600';
  if (status >= 300 && status < 400) return 'bg-blue-600';
  if (status >= 400 && status < 500) return 'bg-orange-600';
  if (status >= 500) return 'bg-red-600';
  return 'bg-gray-600';
}

function formatTimestamp(timestamp: string | number) {
  const ms = typeof timestamp === 'string' ? timestamp : String(timestamp);
  if (ms.includes('.')) {
    return ms;
  }
  const date = new Date(Number(ms));
  const time = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const m = date.getMilliseconds().toString().padStart(3, '0');
  return `${time}.${m}`;
}

function getMethodBadge(method: string) {
  const colors: Record<string, string> = {
    GET: 'bg-green-600',
    POST: 'bg-blue-600',
    PUT: 'bg-orange-600',
    DELETE: 'bg-red-600',
    PATCH: 'bg-purple-600',
    HEAD: 'bg-gray-600',
    OPTIONS: 'bg-teal-600',
    CONNECT: 'bg-indigo-600',
    TRACE: 'bg-cyan-600',
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-bold text-white ${colors[method.toUpperCase()] || 'bg-gray-600'}`}>
      {method.toUpperCase()}
    </span>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const METHOD_FILTERS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'];
const STATUS_FILTERS = [
  { label: '2xx', min: 200, max: 299 },
  { label: '3xx', min: 300, max: 399 },
  { label: '4xx', min: 400, max: 499 },
  { label: '5xx', min: 500, max: 599 },
];

interface FilterState {
  search: string;
  methods: Set<string>;
  statusCodes: Set<string>;
}

function LogEntry({ log, expanded, onToggle }: { log: DebugLog; expanded: boolean; onToggle: () => void }) {
  const [activeTab, setActiveTab] = useState<'details' | 'headers' | 'body' | 'curl'>('details');

  const isProxyLog = log.type === 'proxy-log';
  const proxyData = isProxyLog ? log.data as ProxyLogEntry : null;

  return (
    <div className="border-b">
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-muted/50 cursor-pointer"
        onClick={onToggle}
      >
        <span className="text-xs text-muted-foreground font-mono w-28 flex-shrink-0">
          {proxyData ? formatTimestamp(proxyData.timestamp) : formatTimestamp(log.timestamp)}
        </span>

        {isProxyLog && proxyData && (
          <>
            {proxyData.method && getMethodBadge(proxyData.method)}
            {proxyData.status && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-bold text-white ${getStatusColor(proxyData.status)}`}>
                {proxyData.status}
              </span>
            )}
            <span className="text-sm flex-1 truncate">
              <span className="font-mono text-xs">
                {proxyData.host}{proxyData.url?.split(proxyData.host)?.[1] || proxyData.url}
              </span>
            </span>
            {proxyData.duration_ms && (
              <span className="text-xs text-muted-foreground font-mono">
                {proxyData.duration_ms}ms
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {proxyData.server_bytes > 0 ? formatBytes(proxyData.server_bytes) : ''}
            </span>
          </>
        )}

        {log.type === 'connection' && (
          <>
            <Badge variant="secondary">CONN</Badge>
            <span className="text-sm font-mono text-xs">
              {(log.data as { host?: string; port?: number })?.host}:{(log.data as { host?: string; port?: number })?.port}
            </span>
          </>
        )}

        {log.type === 'connection-close' && (
          <Badge variant="outline">CLOSE</Badge>
        )}

        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {expanded && isProxyLog && proxyData && (
        <div className="px-4 py-3 bg-muted/30 border-t">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="mb-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="headers">Headers</TabsTrigger>
              <TabsTrigger value="body">Body</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === 'details' && (
            <div className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Method:</span> {proxyData.method}</div>
                <div><span className="text-muted-foreground">Status:</span> {proxyData.status} {proxyData.status_text}</div>
                <div><span className="text-muted-foreground">Host:</span> {proxyData.host}</div>
                <div><span className="text-muted-foreground">Port:</span> {proxyData.port}</div>
                <div><span className="text-muted-foreground">Duration:</span> {proxyData.duration_ms}ms</div>
                <div><span className="text-muted-foreground">Client:</span> {proxyData.client_addr}</div>
                <div><span className="text-muted-foreground">Client Bytes:</span> {formatBytes(proxyData.client_bytes)}</div>
                <div><span className="text-muted-foreground">Server Bytes:</span> {formatBytes(proxyData.server_bytes)}</div>
              </div>
              {proxyData.url && (
                <div>
                  <span className="text-muted-foreground">URL:</span>
                  <div className="mt-1 p-2 bg-background rounded break-all">{proxyData.url}</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'headers' && (
            <div className="space-y-3 text-xs font-mono">
              <div>
                <div className="font-semibold text-muted-foreground mb-1">REQUEST HEADERS</div>
                <div className="bg-background p-2 rounded max-h-48 overflow-auto">
                  {proxyData.request_headers ? (
                    proxyData.request_headers.map(([k, v]) => (
                      <div key={k} className="break-all"><span className="text-blue-600">{k}:</span> {v}</div>
                    ))
                  ) : (
                    <span className="text-muted-foreground">No headers</span>
                  )}
                </div>
              </div>
              {proxyData.response_headers && proxyData.response_headers.length > 0 && (
                <div>
                  <div className="font-semibold text-muted-foreground mb-1">RESPONSE HEADERS</div>
                  <div className="bg-background p-2 rounded max-h-48 overflow-auto">
                    {proxyData.response_headers.map(([k, v]) => (
                      <div key={k} className="break-all"><span className="text-green-600">{k}:</span> {v}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'body' && (
            <div className="space-y-3 text-xs font-mono">
              <div>
                <div className="font-semibold text-muted-foreground mb-1">REQUEST BODY ({proxyData.request_body_size || 0} bytes)</div>
                <div className="bg-background p-2 rounded max-h-48 overflow-auto whitespace-pre-wrap">
                  {proxyData.request_body || <span className="text-muted-foreground">No body</span>}
                </div>
              </div>
              <div>
                <div className="font-semibold text-muted-foreground mb-1">RESPONSE BODY ({proxyData.response_body_size || 0} bytes)</div>
                <div className="bg-background p-2 rounded max-h-48 overflow-auto whitespace-pre-wrap">
                  {proxyData.response_body ? (
                    proxyData.response_body.length > 1000
                      ? proxyData.response_body.substring(0, 1000) + '...'
                      : proxyData.response_body
                  ) : (
                    <span className="text-muted-foreground">No body</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'curl' && (
            <div className="bg-background p-3 rounded text-xs font-mono whitespace-pre-wrap">
              {proxyData.curl || <span className="text-muted-foreground">No curl command</span>}
            </div>
          )}
        </div>
      )}

      {expanded && !isProxyLog && (
        <div className="px-4 py-3 bg-muted/30 border-t">
          <pre className="text-xs font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(log.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function DebuggerPage() {
  const logs = useTrafficStore((state) => state.logs);
  const clearLogs = useTrafficStore((state) => state.clearLogs);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<FilterState>({
    search: '',
    methods: new Set(),
    statusCodes: new Set(),
  });

  const toggleExpanded = (id: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (log.type !== 'proxy-log') return true;

      const data = log.data as ProxyLogEntry;

      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matchesSearch =
          data.url?.toLowerCase().includes(searchLower) ||
          data.host?.toLowerCase().includes(searchLower) ||
          data.method?.toLowerCase().includes(searchLower) ||
          data.request_body?.toLowerCase().includes(searchLower) ||
          data.response_body?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (filter.methods.size > 0 && data.method) {
        if (!filter.methods.has(data.method.toUpperCase())) return false;
      }

      if (filter.statusCodes.size > 0 && data.status) {
        let matchesStatus = false;
        for (const code of filter.statusCodes) {
          const range = STATUS_FILTERS.find(f => f.label === code);
          if (range && data.status >= range.min && data.status <= range.max) {
            matchesStatus = true;
            break;
          }
        }
        if (!matchesStatus) return false;
      }

      return true;
    });
  }, [logs, filter]);

  const toggleMethod = (method: string) => {
    setFilter(prev => {
      const next = new Set(prev.methods);
      if (next.has(method)) {
        next.delete(method);
      } else {
        next.add(method);
      }
      return { ...prev, methods: next };
    });
  };

  const toggleStatus = (status: string) => {
    setFilter(prev => {
      const next = new Set(prev.statusCodes);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return { ...prev, statusCodes: next };
    });
  };

  const clearFilters = () => {
    setFilter({ search: '', methods: new Set(), statusCodes: new Set() });
  };

  const hasActiveFilters = filter.search || filter.methods.size > 0 || filter.statusCodes.size > 0;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Bug className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Event Debugger</h1>
            <p className="text-sm text-muted-foreground">Real-time proxy traffic log</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground mr-4">
            {filteredLogs.length} / {logs.length} logs
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearLogs}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search URL, host, method, body..."
            value={filter.search}
            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            className="flex-1"
          />
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Method:</span>
            <div className="flex gap-1">
              {METHOD_FILTERS.map(method => (
                <button
                  key={method}
                  onClick={() => toggleMethod(method)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    filter.methods.has(method)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-muted-foreground/30 hover:bg-muted'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <div className="flex gap-1">
              {STATUS_FILTERS.map(status => (
                <button
                  key={status.label}
                  onClick={() => toggleStatus(status.label)}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    filter.statusCodes.has(status.label)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-muted-foreground/30 hover:bg-muted'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-base">Traffic Log</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              {logs.length === 0 ? (
                <>
                  <Bug className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-2">No traffic captured</p>
                  <p className="text-sm">Start proxy and make HTTP requests to see logs here</p>
                </>
              ) : (
                <>
                  <Search className="h-12 w-12 mb-4 opacity-20" />
                  <p className="text-lg font-medium mb-2">No matching logs</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </>
              )}
            </div>
          ) : (
            <ScrollArea className="h-full">
              {filteredLogs.reverse().map((log) => (
                <LogEntry
                  key={log.id}
                  log={log}
                  expanded={expandedLogs.has(log.id)}
                  onToggle={() => toggleExpanded(log.id)}
                />
              ))}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
