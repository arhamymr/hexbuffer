'use client';

import { useState } from 'react';
import { FileText, Table2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TextEditor } from '@/components/ui/text-editor';
import { buildRawHttpRequest, buildRawHttpResponse, formatJsonBody } from '@/lib/http-message';
import { useHistoryDetail } from '@/pages/live-traffic/hooks/use-history-detail';
import { InspectorSection, buildHeadersList, buildParamsList } from './inspector';
import { parseCookieHeader } from './cookie-display';
import { formatBytes, getMethodBadge } from './utils';

type DetailViewMode = 'text' | 'table';

function isJsonContent(headers: Record<string, string>, body: string | null): boolean {
  if (!body) {
    return false;
  }

  const contentType = Object.entries(headers)
    .find(([name]) => name.toLowerCase() === 'content-type')?.[1]
    .toLowerCase() ?? '';

  return contentType.includes('json') || body.trim().startsWith('{') || body.trim().startsWith('[');
}

export function LogEntryBurpView() {
  const { selectedCallId, call, isLoading, loadError } = useHistoryDetail();
  const [viewMode, setViewMode] = useState<DetailViewMode>('text');

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

  if (loadError) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>Failed to load request details</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
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

  const rawRequest = buildRawHttpRequest({
    method: call.method,
    url: call.url,
    headers: call.headers,
    body: isJsonContent(call.headers, call.request_body)
      ? formatJsonBody(call.request_body ?? '')
      : call.request_body ?? '',
  });
  const rawResponse = call.response_status
    ? buildRawHttpResponse({
      status: call.response_status,
      status_text: call.response_status_text ?? '',
      headers: call.response_headers,
      body: call.response_body ?? '',
    }, { prettyJsonBody: true })
    : '';

  const statusVariant =
    call.response_status && call.response_status >= 200 && call.response_status < 300
      ? 'default'
      : call.response_status && call.response_status >= 400
        ? 'destructive'
        : 'secondary';
  const requestHeaders = buildHeadersList(call.headers);
  const requestCookies = parseCookieHeader(call.headers['cookie']);
  const requestParams = buildParamsList(call.query_params);
  const responseHeaders = buildHeadersList(call.response_headers);
  const responseCookies = parseCookieHeader(call.response_headers['set-cookie']);

  return (
    <div className="grid h-full min-h-0 grid-cols-2 gap-0 bg-muted">
      <div className="min-h-0 border-r">
        <div className="flex flex-col h-full bg-background">
          <div className="bg-muted h-10 px-3 py-2 border-b flex items-center justify-between gap-2 min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-sm font-medium">
                {viewMode === 'text' ? 'Request' : 'Request Inspector'}
              </span>
              {call.method && getMethodBadge(call.method)}
              <span className="text-xs font-mono truncate text-muted-foreground" title={call.url}>
                {call.url}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              <Switch
                checked={viewMode === 'table'}
                onCheckedChange={(checked) => setViewMode(checked ? 'table' : 'text')}
                aria-label="Switch between full text and inspector table view"
                title="Switch between full text and inspector table view"
              />
              <Table2 className="h-3.5 w-3.5" />
            </div>
          </div>

          {viewMode === 'text' ? (
            <div className="flex h-full min-h-0 flex-col p-2">
              <Label className="mb-1 block text-xs text-muted-foreground">
                Raw Request
              </Label>
              <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
                <TextEditor
                  language="http"
                  value={rawRequest}
                  options={{
                    readOnly: true,
                    scrollBeyondLastLine: false,
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineHeight: 18,
                    renderWhitespace: 'selection',
                    padding: { top: 12, bottom: 12 },
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <InspectorSection title="Headers" items={requestHeaders} defaultView="table" />
              <InspectorSection
                title="Cookies"
                items={requestCookies.map((cookie) => ({ name: cookie.name, value: cookie.value }))}
                defaultView="table"
              />
              {requestParams.length > 0 && (
                <InspectorSection title="Params" items={requestParams} defaultView="table" />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0">
        <div className="flex flex-col h-full bg-background">
          <div className="bg-muted h-10 px-3 py-2 border-b flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Response</span>
            {call.response_status && (
              <Badge variant={statusVariant} className="text-xs">
                {call.response_status} {call.response_status_text}
              </Badge>
            )}
          </div>

          {viewMode === 'text' ? (
            <div className="flex h-full min-h-0 flex-col p-2">
              <Label className="mb-1 block text-xs text-muted-foreground">
                Raw Response
              </Label>
              <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
                <TextEditor
                  language="http"
                  value={rawResponse}
                  options={{
                    readOnly: true,
                    scrollBeyondLastLine: false,
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineHeight: 18,
                    renderWhitespace: 'selection',
                    padding: { top: 12, bottom: 12 },
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="mb-2 text-xs text-muted-foreground">
                {formatBytes(call.response_body_size)} received
              </div>
              <InspectorSection title="Headers" items={responseHeaders} defaultOpen={false} defaultView="table" />
              {responseCookies.length > 0 && (
                <InspectorSection
                  title="Cookies"
                  items={responseCookies.map((cookie) => ({ name: cookie.name, value: cookie.value }))}
                  defaultOpen={false}
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
          )}
        </div>
      </div>
    </div>
  );
}
