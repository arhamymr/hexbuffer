"use client";

import { useState } from 'react';
import { Bug, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebugLogs, type DebugLog, type ParsedRequest, type ParsedResponse } from '@/hooks/useDebugLogs';
import type { ApiCall, ProxyConnection, RequestType } from '@/types';

function getTypeBadge(type: DebugLog['type']) {
  switch (type) {
    case 'api-call':
      return <Badge variant="default">API</Badge>;
    case 'connection':
      return <Badge variant="secondary">CONN</Badge>;
    case 'connection-close':
      return <Badge variant="outline">CLOSE</Badge>;
    case 'error':
      return <Badge variant="destructive">ERR</Badge>;
    case 'logger-request':
      return <Badge variant="default">REQ</Badge>;
    case 'logger-curl':
      return <Badge variant="secondary">CURL</Badge>;
    case 'logger-response':
      return <Badge variant="outline">RESP</Badge>;
  }
}

function getRequestTypeBadge(type: RequestType) {
  const colors: Record<RequestType, string> = {
    XHR: 'bg-blue-500',
    Media: 'bg-purple-500',
    CSS: 'bg-pink-500',
    JS: 'bg-yellow-500',
    Document: 'bg-green-500',
    Font: 'bg-orange-500',
    Other: 'bg-gray-500',
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${colors[type]}`}>
      {type}
    </span>
  );
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

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${time}.${ms}`;
}

function LogEntry({ log, expanded, onToggle }: { log: DebugLog; expanded: boolean; onToggle: () => void }) {
  const [activeTab, setActiveTab] = useState<'json' | 'raw'>('json');

  if (log.type !== 'api-call' || !expanded) {
    return (
      <div className="border-b">
        <div
          className="flex items-center gap-3 py-2 px-3 hover:bg-muted/50 cursor-pointer"
          onClick={onToggle}
        >
          <span className="text-xs text-muted-foreground font-mono w-24 flex-shrink-0">
            {formatTime(log.timestamp)}
          </span>
          {getTypeBadge(log.type)}
          <span className="text-sm truncate flex-1">
            {log.type === 'api-call' && (
              <span className="font-mono">
                {((log.data as ApiCall).method)} {((log.data as ApiCall).host)}{((log.data as ApiCall).path)}
              </span>
            )}
            {log.type === 'connection' && (
              <span className="font-mono">
                conn {((log.data as ProxyConnection).host)}:{((log.data as ProxyConnection).port)}
              </span>
            )}
            {log.type === 'connection-close' && (
              <span className="font-mono">
                closed {((log.data as ProxyConnection).host)}
              </span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {expanded ? '▼' : '▶'}
          </span>
        </div>
      </div>
    );
  }

  const apiCall = log.data as ApiCall;

  return (
    <div className="border-b">
      <div
        className="flex items-center gap-3 py-2 px-3 hover:bg-muted/50 cursor-pointer"
        onClick={onToggle}
      >
        <span className="text-xs text-muted-foreground font-mono w-24 flex-shrink-0">
          {formatTime(log.timestamp)}
        </span>
        {getTypeBadge(log.type)}
        {getMethodBadge(apiCall.method)}
        {getRequestTypeBadge(apiCall.request_type || 'Other')}
        <span className="text-sm truncate flex-1">
          <span className="font-mono">
            {apiCall.host}{apiCall.path}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          {expanded ? '▼' : '▶'}
        </span>
      </div>
      {expanded && (
        <div className="px-4 py-3 bg-muted/30 border-t">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'json' | 'raw')}>
            <TabsList className="mb-2">
              <TabsTrigger value="json">JSON</TabsTrigger>
              <TabsTrigger value="raw">RAW Data</TabsTrigger>
            </TabsList>
          </Tabs>
          {activeTab === 'json' ? (
            <pre className="text-xs font-mono whitespace-pre-wrap break-all max-h-96 overflow-auto">
              {JSON.stringify(log.data, null, 2)}
            </pre>
          ) : (
            <div className="space-y-3 text-xs font-mono">
              <div>
                <div className="font-semibold text-muted-foreground mb-1">REQUEST</div>
                <div className="bg-background px-3 py-2 rounded border">
                  <div className="font-bold">{apiCall.method} {apiCall.url}</div>
                  <div className="mt-2 space-y-1">
                    <div className="text-muted-foreground">Headers:</div>
                    {Object.entries(apiCall.headers || {}).map(([k, v]) => (
                      <div key={k} className="ml-2">{k}: {v}</div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <div className="text-muted-foreground">Cookies: {Object.keys(apiCall.cookies || {}).length > 0 ? '' : '(none)'}</div>
                    {apiCall.cookies && Object.keys(apiCall.cookies).length > 0 ? (
                      Object.entries(apiCall.cookies).map(([k, v]) => (
                        <div key={k} className="ml-2">{k}={v}</div>
                      ))
                    ) : (
                      <div className="ml-2 text-muted-foreground italic">no cookies in request</div>
                    )}
                  </div>
                  <div className="mt-2">
                    <div className="text-muted-foreground">Query Params: {Object.keys(apiCall.query_params || {}).length > 0 ? '' : '(none)'}</div>
                    {apiCall.query_params && Object.keys(apiCall.query_params).length > 0 ? (
                      Object.entries(apiCall.query_params).map(([k, v]) => (
                        <div key={k} className="ml-2">{k}={v}</div>
                      ))
                    ) : (
                      <div className="ml-2 text-muted-foreground italic">no query params in URL</div>
                    )}
                  </div>
                  {apiCall.request_body && (
                    <div className="mt-2">
                      <div className="text-muted-foreground">Body:</div>
                      <div className="ml-2 whitespace-pre-wrap">{apiCall.request_body}</div>
                    </div>
                  )}
                </div>
              </div>
              {apiCall.response_status && (
                <div>
                  <div className="font-semibold text-muted-foreground mb-1">RESPONSE</div>
                  <div className="bg-background px-3 py-2 rounded border">
                    <div className="font-bold">Status: {apiCall.response_status} {apiCall.response_status_text || ''}</div>
                    <div className="mt-2 space-y-1">
                      <div className="text-muted-foreground">Headers:</div>
                      {Object.entries(apiCall.response_headers || {}).map(([k, v]) => (
                        <div key={k} className="ml-2">{k}: {v}</div>
                      ))}
                    </div>
                    {apiCall.response_cookies && Object.keys(apiCall.response_cookies).length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-muted-foreground">Set-Cookie:</div>
                        {Object.entries(apiCall.response_cookies).map(([k, v]) => (
                          <div key={k} className="ml-2">{k}={v}</div>
                        ))}
                      </div>
                    )}
                    {apiCall.response_body && (
                      <div className="mt-2">
                        <div className="text-muted-foreground">Body ({apiCall.response_body_size} bytes):</div>
                        <div className="ml-2 whitespace-pre-wrap max-h-32 overflow-auto">
                          {apiCall.response_body.length > 500
                            ? apiCall.response_body.substring(0, 500) + '...'
                            : apiCall.response_body}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div>
                <div className="font-semibold text-muted-foreground mb-1">METADATA</div>
                <div className="bg-background px-3 py-2 rounded border">
                  <div>ID: {apiCall.id}</div>
                  <div>Session: {apiCall.session_id}</div>
                  <div>Target: {apiCall.target_id}</div>
                  <div>Security: {apiCall.security_state}</div>
                  {apiCall.server_ip && <div>Server IP: {apiCall.server_ip}</div>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DebuggerPage() {
  const { logs, setLogs } = useDebugLogs();
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

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

  

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Bug className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Event Debugger</h1>
            <p className="text-sm text-muted-foreground">Real-time proxy event monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground mr-4">
            {logs.length} events captured
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLogs([])}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-base">Event Log</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bug className="h-12 w-12 mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">No events captured</p>
              <p className="text-sm">Configure your browser proxy and make requests to see events here</p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              {logs.map((log) => (
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
