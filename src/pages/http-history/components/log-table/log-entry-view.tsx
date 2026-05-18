'use client';

import type { ApiCall } from '@/types';
import { InspectorSection, buildHeadersList, buildParamsList } from './inspector';
import { parseCookieHeader } from './cookie-display';
import { getMethodBadge, getStatusColor, formatBytes } from './utils';
import { Copy } from 'lucide-react';
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getHttpLogs } from '@/pages/http-history/api';
import { useFilterStore } from '@/stores/filter';
import { filterStateToProxyFilter } from '@/stores/filter';
import { useEffect, useState } from 'react';
import { useLogStore } from '@/stores/log';

function PrettyCurl({ call }: { call: ApiCall }) {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const buildCurlCommand = (): string => {
    let cmd = `curl -X ${call.method} '${call.url}'`;
    for (const [k, v] of Object.entries(call.headers)) {
      cmd += ` \\\n  -H '${k}: ${v}'`;
    }
    if (call.request_body) {
      cmd += ` \\\n  -d '${call.request_body}'`;
    }
    return cmd;
  };

  return (
    <div className="relative mt-2 border rounded-md overflow-hidden">
      <div className="absolute right-1 top-1 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            copyToClipboard(buildCurlCommand());
          }}
          title="Copy cURL"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <pre className="bg-background p-3 rounded text-xs font-mono whitespace-pre-wrap overflow-auto max-h-40">
        {buildCurlCommand()}
      </pre>
    </div>
  );
}

function PrettyJson({ content }: { content: string }) {
  try {
    const parsed = JSON.parse(content);
    return (
      <pre className="bg-background p-3 rounded text-xs font-mono whitespace-pre-wrap overflow-auto max-h-40">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    );
  } catch {
    return (
      <pre className="bg-background p-3 rounded-md border text-xs font-mono whitespace-pre-wrap overflow-auto max-h-40">
        {content}
      </pre>
    );
  }
}

function adaptProxyRecordToApiCall(record: any): ApiCall {
  const uri = record.request.uri;
  const urlObj = uri.includes('://') ? new URL(uri) : null;
  return {
    id: record.id,
    session_id: '',
    target_id: '',
    timestamp: new Date(record.timestamp).getTime(),
    request_type: 'Other',
    method: record.request.method,
    url: uri,
    host: urlObj?.host || uri.split('://').pop()?.split('/')[0] || '',
    path: urlObj?.pathname || '/',
    query_params: {},
    headers: record.request.headers,
    cookies: {},
    request_body: new TextDecoder().decode(new Uint8Array(record.request.body)),
    request_body_size: record.request.body.length,
    response_status: record.response?.status_code ?? null,
    response_status_text: record.response?.status_text || null,
    response_headers: record.response?.headers || {},
    response_cookies: {},
    response_body: record.response ? new TextDecoder().decode(new Uint8Array(record.response.body)) : null,
    response_body_size: record.response?.body.length ?? 0,
    response_content_type: record.response?.headers['content-type'] || null,
    security_state: '',
    server_ip: record.server_addr || null,
    duration_ms: null,
  };
}

export function LogEntryBurpView() {
  const selectedCallId = useLogStore((state) => state.selectedCallId);
  const filter = useFilterStore((state) => state.filter);
  const [call, setCall] = useState<ApiCall | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!selectedCallId) {
      setCall(null);
      return;
    }

    const fetchCall = async () => {
      setIsLoading(true);
      try {
        const proxyFilter = filterStateToProxyFilter(filter);
        const result = await getHttpLogs(1, 100, proxyFilter, 'desc');
        const found = result.data.find((r: any) => r.id === selectedCallId);
        setCall(found ? adaptProxyRecordToApiCall(found) : null);
      } catch (error) {
        console.error('Failed to fetch call:', error);
        setCall(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCall();
  }, [selectedCallId, filter]);

  if (!selectedCallId) {
    return (
      <Empty>
        <EmptyTitle>No request selected</EmptyTitle>
        <EmptyDescription>Select a request from the table to view its details.</EmptyDescription>
      </Empty>
    );
  }

  if (isLoading) {
    return (
      <Empty>
        <EmptyTitle>Loading...</EmptyTitle>
      </Empty>
    );
  }

  if (!call) {
    return (
      <Empty>
        <EmptyTitle>Request not found</EmptyTitle>
        <EmptyDescription>The selected request could not be found.</EmptyDescription>
      </Empty>
    );
  }

  const requestHeaders = buildHeadersList(call.headers);
  const requestCookies = parseCookieHeader(call.headers['cookie']);
  const requestParams = buildParamsList(call.query_params);

  const responseHeaders = buildHeadersList(call.response_headers);
  const responseCookies = parseCookieHeader(call.response_headers['set-cookie']);

  return (
    <div className="flex-1 grid grid-cols-2 gap-0 min-h-0 p-1">
      <div className="border rounded-l-md border-r-0 overflow-hidden flex flex-col">
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            {call.method && getMethodBadge(call.method)}
            <span className="text-xs font-mono truncate flex-1" title={call.url}>
              {call.url}
            </span>
          </div>
        </div>

        <div className="p-3 flex-1 overflow-auto">
          <div className="mb-3">
            <InspectorSection title="Headers" items={requestHeaders} />
            <InspectorSection title="Cookies" items={requestCookies.map(c => ({ name: c.name, value: c.value }))} />
            {requestParams.length > 0 && (
              <InspectorSection title="Params" items={requestParams} />
            )}
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">PRETTY</div>
            <PrettyCurl call={call} />
          </div>
        </div>
      </div>

      <div className="border rounded-r-md overflow-hidden flex flex-col">
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            {call.response_status && (
              <span
                className={`text-xs px-2 py-0.5 rounded font-mono font-bold text-white ${getStatusColor(call.response_status)}`}
              >
                {call.response_status} {call.response_status_text}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatBytes(call.response_body_size)} received
            </span>
          </div>
        </div>

        <div className="p-3 flex-1 overflow-auto">
          <div className="mb-3">
            <InspectorSection title="Headers" items={responseHeaders} defaultOpen={false} />
            {responseCookies.length > 0 && (
              <InspectorSection
                title="Cookies"
                items={responseCookies.map(c => ({ name: c.name, value: c.value }))}
                defaultOpen={false}
              />
            )}
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">PRETTY</div>
            {call.response_body ? (
              <PrettyJson content={call.response_body} />
            ) : (
              <div className="bg-background p-3 rounded text-xs text-muted-foreground">
                No response body
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}