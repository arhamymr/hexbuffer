import { useState } from 'react';
import { ListIcon, ArrowSquareOutIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TextEditor } from '@/components/ui/text-editor';
import { useRepeaterStore } from '@/stores/repeater';
import { useCollectionsStore } from '@/stores/collections';
import { useNavStore } from '@/stores/nav';
import { toast } from 'sonner';
import type { MockDomain, MockRoute, RequestLog } from '../types';

interface LogsProps {
  logs: RequestLog[];
  domains: MockDomain[];
  routes: MockRoute[];
  selectedLogId: string | null;
  onSelect: (id: string) => void;
}

function statusColor(code: number) {
  if (code < 300) return 'text-green-400';
  if (code < 400) return 'text-yellow-400';
  return 'text-red-400';
}

function methodColor(method: string) {
  const map: Record<string, string> = {
    GET: 'bg-green-500/10 text-green-400 border-green-500/20',
    POST: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    PUT: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
    PATCH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    OPTIONS: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  return map[method] ?? 'bg-muted text-muted-foreground border-transparent';
}

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function LogsPanel({ logs, domains, routes, selectedLogId, onSelect }: LogsProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter((log) => {
    const domain = domains.find((d) => d.id === log.domainId);
    const search = searchQuery.toLowerCase();
    return (
      log.path.toLowerCase().includes(search) ||
      log.method.toLowerCase().includes(search) ||
      log.statusCode.toString().includes(search) ||
      (domain && domain.hostname.toLowerCase().includes(search))
    );
  });

  const selectedLog = logs.find((l) => l.id === selectedLogId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Left: log list */}
      <div className="flex w-[420px] shrink-0 flex-col border-r bg-background">
        <div className="flex flex-col gap-2 border-b p-3 bg-muted/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ListIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Gateway Logs</h3>
            </div>
            <Badge variant="secondary" className="text-[10px] font-mono rounded px-1.5 py-0.5 leading-none bg-muted text-muted-foreground">
              {filteredLogs.length} logs
            </Badge>
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search logs by path, host, method, status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7.5 h-7.5 text-xs bg-muted/30 focus-visible:ring-primary focus-visible:ring-1 border-border"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <ListIcon className="h-8 w-8 opacity-40" />
              <p className="text-sm font-medium">No requests logged yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20 border-b">
              {filteredLogs.map((log) => {
                const domain = domains.find((d) => d.id === log.domainId);
                const isSelected = selectedLogId === log.id;
                return (
                  <div
                    key={log.id}
                    className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors hover:bg-muted/40 ${isSelected ? 'bg-muted/50' : ''
                      }`}
                    onClick={() => onSelect(log.id)}
                  >
                    <span
                      className={`shrink-0 rounded-[3px] border px-1.5 py-0.5 text-[9px] font-bold leading-tight ${methodColor(log.method)}`}
                    >
                      {log.method}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs font-medium text-foreground">{log.path}</p>
                      {domain && (
                        <p className="truncate text-[10px] text-muted-foreground font-mono mt-0.5">{domain.hostname}</p>
                      )}
                    </div>
                    <span className={`shrink-0 font-mono text-xs font-bold ${statusColor(log.statusCode)}`}>
                      {log.statusCode}
                    </span>
                    <span className="w-14 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                      {log.latencyMs}ms
                    </span>
                    <span className="w-18 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                      {formatTime(log.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right: log detail */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {selectedLog ? (
          <LogDetail log={selectedLog} domains={domains} routes={routes} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/5">
            <div className="text-center">
              <ListIcon className="mx-auto mb-2 h-8 w-8 opacity-30 text-muted-foreground" />
              <p className="text-sm font-medium">Select a logged gateway request to inspect details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LogDetail({
  log,
  domains,
  routes,
}: {
  log: RequestLog;
  domains: MockDomain[];
  routes: MockRoute[];
}) {
  const [tab, setTab] = useState<'request' | 'response'>('request');
  const domain = domains.find((d) => d.id === log.domainId);
  const route = routes.find((r) => r.id === log.routeId);

  const handleSendToRepeater = async () => {
    try {
      const protocol = domain?.ssl ? 'https' : 'http';
      const hostname = domain?.hostname || 'localhost';
      const url = `${protocol}://${hostname}${log.path}`;

      const repeaterStore = useRepeaterStore.getState();
      let ws = repeaterStore.workspaces.find(w => w.name === 'mock-forge');
      let wsId = '';
      if (!ws) {
        wsId = repeaterStore.createWorkspace('mock-forge');
      } else {
        wsId = ws.id;
        repeaterStore.setActiveWorkspaceId(wsId);
      }

      const collectionsStore = useCollectionsStore.getState();
      let stash = collectionsStore.stashes.find(s => s.parentId === wsId);
      let stashId = '';
      if (!stash) {
        stashId = await collectionsStore.createStash('mock-forge', wsId);
      } else {
        stashId = stash.id;
      }

      const endpointName = `${log.method} ${log.path}`;
      const epId = await collectionsStore.createEndpoint(stashId, endpointName);

      const headersObj = log.requestHeaders || {};
      const parsedHeaders = Object.entries(headersObj).map(([key, value]) => ({
        key,
        value,
        enabled: true,
      }));

      const queryParams = url.includes('?')
        ? url.substring(url.indexOf('?') + 1).split('&').map(pair => {
          const eq = pair.indexOf('=');
          return {
            key: eq !== -1 ? decodeURIComponent(pair.substring(0, eq)) : decodeURIComponent(pair),
            value: eq !== -1 ? decodeURIComponent(pair.substring(eq + 1)) : '',
            enabled: true,
          };
        }).filter(p => p.key)
        : [];

      collectionsStore.setSelectedNodeId(`ep-${epId}`);
      collectionsStore.updateActiveRequest(() => ({
        method: log.method,
        url,
        headers: parsedHeaders,
        body: log.requestBody || '',
        bodyType: log.requestBody ? 'json' : 'none',
        preScript: '',
        testScript: '',
        response: null,
        isLoading: false,
        error: null,
        testResults: [],
        queryParams,
      }));

      await collectionsStore.saveActiveEndpoint();
      useNavStore.getState().triggerNavBlink('/repeater');
      toast.success(`Sent to Repeater: ${log.method} ${log.path}`);
    } catch (error) {
      console.error('Failed to send request to Repeater:', error);
      toast.error('Failed to send request to Repeater');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background border-l">
      {/* Header */}
      <div className="border-b px-4 py-3 bg-muted/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <span
            className={`rounded-[3px] border px-2 py-0.5 text-xs font-bold leading-tight ${methodColor(log.method)}`}
          >
            {log.method}
          </span>
          <span className="font-mono text-sm font-semibold text-foreground truncate max-w-[280px] lg:max-w-md">{log.path}</span>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <span className={`font-mono text-xs ${statusColor(log.statusCode)}`}>
              HTTP {log.statusCode}
            </span>
            <Badge variant="outline" className="text-[10px] font-mono bg-muted/50 border-border">
              {log.latencyMs}ms
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs border-border cursor-pointer"
              onClick={handleSendToRepeater}
            >
              <ArrowSquareOutIcon className="mr-1 h-3.5 w-3.5" />
              To Repeater
            </Button>
          </div>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-muted-foreground">
          {domain && <span>Host: {domain.hostname}</span>}
          {route && <span>Ruleset Match: {route.path}</span>}
          <span>Timestamp: {new Date(log.timestamp).toLocaleString()}</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex shrink-0 border-b bg-muted/5">
        {(['request', 'response'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-semibold capitalize transition-colors hover:text-foreground relative cursor-pointer ${tab === t
              ? 'text-primary'
              : 'text-muted-foreground'
              }`}
          >
            {t}
            {tab === t && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1 p-2 bg-muted/5">
        {tab === 'request' ? (
          <div className="space-y-4">
            <Section title="Request Headers">
              <HeaderTable headers={log.requestHeaders} />
            </Section>
            {log.requestBody && (
              <>
                <Separator className="bg-border/40" />
                <Section title="Request Body">
                  <div className="h-[240px] rounded border border-border overflow-hidden bg-code-bg mt-1.5">
                    <TextEditor
                      value={tryPrettyJson(log.requestBody)}
                      language="json"
                      options={{ readOnly: true }}
                      height="100%"
                    />
                  </div>
                </Section>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {route ? (
              <>
                <Section title="Response Headers">
                  <HeaderTable headers={route.responseHeaders} />
                </Section>
                <Separator className="bg-border" />
                <Section title="Response Body">
                  <div className="h-[240px] rounded border border-border overflow-hidden bg-code-bg mt-1.5">
                    <TextEditor
                      value={tryPrettyJson(route.responseBody)}
                      language="json"
                      options={{ readOnly: true }}
                      height="100%"
                    />
                  </div>
                </Section>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground font-mono bg-muted/10">
                No matching route configuration found. The request fell through to default 404 handler.
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

function HeaderTable({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers);
  if (entries.length === 0)
    return <p className="text-xs text-muted-foreground font-mono pl-1">No headers present</p>;
  return (
    <div className="rounded border border-border/80 bg-muted/10 divide-y divide-border/30 overflow-hidden">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-4 px-3 py-1.5 font-mono text-xs hover:bg-muted/20 transition-colors">
          <span className="w-48 shrink-0 truncate text-muted-foreground select-all">{k}</span>
          <span className="truncate text-foreground select-all">{v}</span>
        </div>
      ))}
    </div>
  );
}

function tryPrettyJson(s: string) {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

