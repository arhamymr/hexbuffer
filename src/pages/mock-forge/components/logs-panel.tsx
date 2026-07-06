import { useState } from 'react';
import { ListIcon, ArrowSquareOutIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useRepeaterStore } from '@/stores/repeater';
import { useCollectionsStore } from '@/stores/collections';
import { useNavStore } from '@/stores/nav';
import { buildRawHttpRequest } from '@/lib/http-message';
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
    GET: 'bg-green-500/15 text-green-400 border-green-500/30',
    POST: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    PUT: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
    PATCH: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    OPTIONS: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  };
  return map[method] ?? 'bg-muted text-muted-foreground';
}

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function LogsPanel({ logs, domains, routes, selectedLogId, onSelect }: LogsProps) {
  const selectedLog = logs.find((l) => l.id === selectedLogId) ?? null;

  return (
    <div className="flex h-full min-h-0">
      {/* Left: log list */}
      <div className="flex w-[420px] shrink-0 flex-col border-r">
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <ListIcon className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Request Logs</p>
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {logs.length}
          </Badge>
        </div>
        <ScrollArea className="flex-1">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <ListIcon className="h-8 w-8 opacity-40" />
              <p className="text-sm">No requests logged yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                const domain = domains.find((d) => d.id === log.domainId);
                return (
                  <div
                    key={log.id}
                    className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 transition-colors hover:bg-muted/40 ${
                      selectedLogId === log.id ? 'bg-muted/60' : ''
                    }`}
                    onClick={() => onSelect(log.id)}
                  >
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold leading-tight ${methodColor(log.method)}`}
                    >
                      {log.method}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs">{log.path}</p>
                      {domain && (
                        <p className="truncate text-[10px] text-muted-foreground">{domain.hostname}</p>
                      )}
                    </div>
                    <span className={`shrink-0 font-mono text-xs font-semibold ${statusColor(log.statusCode)}`}>
                      {log.statusCode}
                    </span>
                    <span className="w-14 shrink-0 text-right text-[10px] text-muted-foreground">
                      {log.latencyMs}ms
                    </span>
                    <span className="w-20 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
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
      <div className="flex min-w-0 flex-1 flex-col">
        {selectedLog ? (
          <LogDetail log={selectedLog} domains={domains} routes={routes} />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <ListIcon className="mx-auto mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">Select a request to inspect</p>
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

      // 1. Get repeater store & look for workspace named 'mock-forge'
      const repeaterStore = useRepeaterStore.getState();
      let ws = repeaterStore.workspaces.find(w => w.name === 'mock-forge');
      let wsId = '';
      if (!ws) {
        wsId = repeaterStore.createWorkspace('mock-forge');
      } else {
        wsId = ws.id;
        repeaterStore.setActiveWorkspaceId(wsId);
      }

      // 2. Find collection (stash) belonging to this workspaceId
      const collectionsStore = useCollectionsStore.getState();
      let stash = collectionsStore.stashes.find(s => s.parentId === wsId);
      let stashId = '';
      if (!stash) {
        stashId = await collectionsStore.createStash('mock-forge', wsId);
      } else {
        stashId = stash.id;
      }

      // 3. Create a new endpoint under this stash
      const endpointName = `${log.method} ${log.path}`;
      const epId = await collectionsStore.createEndpoint(stashId, endpointName);

      // 4. Headers
      const headersObj = log.requestHeaders || {};
      const parsedHeaders = Object.entries(headersObj).map(([key, value]) => ({
        key,
        value,
        enabled: true,
      }));

      // Query params parsing
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

      // 5. Update active request
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

      // 6. Save active endpoint
      await collectionsStore.saveActiveEndpoint();

      // 7. Navigate
      useNavStore.getState().triggerNavBlink('/repeater');
      toast.success(`Sent to Repeater: ${log.method} ${log.path}`);
    } catch (error) {
      console.error('Failed to send request to Repeater:', error);
      toast.error('Failed to send request to Repeater');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`rounded border px-2 py-0.5 text-xs font-bold ${methodColor(log.method)}`}
          >
            {log.method}
          </span>
          <span className="font-mono text-sm">{log.path}</span>
          <div className="ml-auto flex items-center gap-2">
            <span className={`font-mono text-sm font-semibold ${statusColor(log.statusCode)}`}>
              {log.statusCode}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {log.latencyMs}ms
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleSendToRepeater}
            >
              <ArrowSquareOutIcon className="mr-1 h-3.5 w-3.5" />
              To Repeater
            </Button>
          </div>
        </div>
        <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
          {domain && <span>{domain.hostname}</span>}
          {route && <span>→ {route.path}</span>}
          <span>{new Date(log.timestamp).toLocaleString()}</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex shrink-0 border-b">
        {(['request', 'response'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs capitalize transition-colors hover:text-foreground ${
              tab === t
                ? 'border-b-2 border-orange-500 font-medium text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1 p-4">
        {tab === 'request' ? (
          <div className="space-y-4">
            <Section title="Request Headers">
              <HeaderTable headers={log.requestHeaders} />
            </Section>
            {log.requestBody && (
              <>
                <Separator />
                <Section title="Request Body">
                  <pre className="rounded bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {tryPrettyJson(log.requestBody)}
                  </pre>
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
                <Separator />
                <Section title="Response Body">
                  <pre className="rounded bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                    {tryPrettyJson(route.responseBody)}
                  </pre>
                </Section>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No matching route — request fell through.</p>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function HeaderTable({ headers }: { headers: Record<string, string> }) {
  const entries = Object.entries(headers);
  if (entries.length === 0)
    return <p className="text-xs text-muted-foreground">No headers</p>;
  return (
    <div className="space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2 font-mono text-xs">
          <span className="w-44 shrink-0 truncate text-muted-foreground">{k}</span>
          <span className="truncate">{v}</span>
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
