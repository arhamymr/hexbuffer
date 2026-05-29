'use client';

import { useEffect, useState } from 'react';
import { fetchHistoryDetail } from '../../services/history-service';
import { adaptProxyRecordToApiCall } from '../../hooks/use-history-table';
import { formatJsonBody } from '@/lib/http-message';
import { InspectorSection, buildHeadersList } from './inspector';
import { parseCookieHeader, formatBytes } from './utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Badge } from '@/components/ui/badge';
import type { ApiCall } from '@/types';

function isJsonContent(headers: Record<string, string>, body: string | null): boolean {
  if (!body) {
    return false;
  }

  const contentType = Object.entries(headers)
    .find(([name]) => name.toLowerCase() === 'content-type')?.[1]
    .toLowerCase() ?? '';

  return contentType.includes('json') || body.trim().startsWith('{') || body.trim().startsWith('[');
}

interface ResponseDetailWindowProps {
  callId: string;
}

export function ResponseDetailWindow({ callId }: ResponseDetailWindowProps) {
  const [call, setCall] = useState<ApiCall | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCall = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const detail = await fetchHistoryDetail(callId);
        setCall(adaptProxyRecordToApiCall(detail));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load response details.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCall();
  }, [callId]);

  if (isLoading) {
    return (
      <Empty>
        <EmptyTitle>Loading...</EmptyTitle>
      </Empty>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Failed to load response details</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
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

  const statusVariant =
    call.response_status && call.response_status >= 200 && call.response_status < 300
      ? 'default'
      : call.response_status && call.response_status >= 400
        ? 'destructive'
        : 'secondary';

  const responseHeaders = buildHeadersList(call.response_headers);
  const responseCookies = parseCookieHeader(call.response_headers['set-cookie']);

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="bg-muted h-10 px-3 py-2 border-b flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium">Response</span>
          <span className="text-xs font-mono truncate text-muted-foreground" title={call.url}>
            {call.method} {call.url}
          </span>
        </div>
        {call.response_status && (
          <Badge variant={statusVariant} className="text-xs">
            {call.response_status} {call.response_status_text}
          </Badge>
        )}
      </div>

      <div className="flex-1 overflow-auto p-3">
        <div className="mb-2 text-xs text-muted-foreground">
          {formatBytes(call.response_body_size)} received
        </div>
        <InspectorSection title="Headers" items={responseHeaders} defaultView="table" />
        {responseCookies.length > 0 && (
          <InspectorSection
            title="Cookies"
            items={responseCookies.map((cookie) => ({ name: cookie.name, value: cookie.value }))}
            defaultView="table"
          />
        )}
        <InspectorSection
          title="Body"
          items={[{
            name: 'Response Body',
            value: isJsonContent(call.response_headers, call.response_body)
              ? formatJsonBody(call.response_body ?? '')
              : call.response_body ?? '',
          }]}
          defaultView="text"
        />
      </div>
    </div>
  );
}
