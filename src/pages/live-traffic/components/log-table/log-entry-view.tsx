'use client';

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { FileText, Table2, EllipsisVertical, ExternalLink, Send, Crosshair } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Label } from '@/components/ui/label';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { TextEditor } from '@/components/ui/text-editor';
import { buildRawHttpRequest, buildRawHttpResponse, formatJsonBody } from '@/lib/http-message';
import { useHistoryDetail } from '@/pages/live-traffic/hooks/use-history-detail';
import { InspectorSection, buildHeadersList, buildParamsList } from './inspector';
import { parseCookieHeader } from './cookie-display';
import { formatBytes } from './utils';
import { MethodBadge } from '@/components/status-badge';
import { useRepeaterStore } from '@/stores/repeater';
import { useInvokerStore } from '@/stores/invoker';
import { createDefaultAttackConfig, findRequestPayloadPositions } from '@/pages/invoker/types';

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
  const navigate = useNavigate();

  const handleOpenInNewWindow = useCallback(async () => {
    if (!call) return;
    const label = `response-detail-${call.id}`;
    try {
      const existing = await WebviewWindow.getByLabel(label);
      if (existing) {
        await existing.setFocus();
        return;
      }
      new WebviewWindow(label, {
        url: `/?window=response-detail&callId=${call.id}`,
        title: `Response - ${call.method} ${call.path || call.url}`,
        width: 700,
        height: 600,
        decorations: true,
        resizable: true,
      });
    } catch {
      window.open(`/?window=response-detail&callId=${call.id}`, '_blank');
    }
  }, [call?.id, call?.method, call?.path, call?.url]);

  const handleSendToRepeater = useCallback(() => {
    if (!call) return;
    useRepeaterStore.getState().addRequestTab({
      raw: buildRawHttpRequest({
        method: call.method,
        url: call.url,
        headers: call.headers,
        body: call.request_body ?? '',
      }),
      url: call.url,
    });
    navigate('/repeater');
    toast.success('Sent to Repeater');
  }, [call, navigate]);

  const handleSendToInvoker = useCallback(() => {
    if (!call) return;
    const baseRequest = {
      method: call.method,
      url: call.url,
      headers: call.headers,
      body: call.request_body ?? '',
      follow_redirects: true,
      max_hops: 10,
    };
    const config = {
      ...createDefaultAttackConfig(),
      name: `${call.method} ${call.path || call.url}`,
      base_request: baseRequest,
      positions: findRequestPayloadPositions(baseRequest),
    };
    useInvokerStore.getState().addAttackTab(config);
    navigate('/invoker');
    toast.success('Sent to Invoker');
  }, [call, navigate]);

  const rawRequest = useMemo(() => call
    ? buildRawHttpRequest({
      method: call.method,
      url: call.url,
      headers: call.headers,
      body: isJsonContent(call.headers, call.request_body)
        ? formatJsonBody(call.request_body ?? '')
        : call.request_body ?? '',
    })
    : '', [call]);
  const rawResponse = useMemo(() => call?.response_status
    ? buildRawHttpResponse({
      status: call.response_status,
      status_text: call.response_status_text ?? '',
      headers: call.response_headers,
      body: call.response_body ?? '',
    }, { prettyJsonBody: true })
    : '', [call]);

  const statusVariant = useMemo(() =>
    call?.response_status && call.response_status >= 200 && call.response_status < 300
      ? 'default'
      : call?.response_status && call.response_status >= 400
        ? 'destructive'
        : 'secondary', [call?.response_status]);
  const requestHeaders = useMemo(() => buildHeadersList(call?.headers ?? {}), [call?.headers]);
  const requestCookies = useMemo(() => parseCookieHeader(call?.headers['cookie']), [call?.headers]);
  const requestParams = useMemo(() => buildParamsList(call?.query_params ?? {}), [call?.query_params]);
  const responseHeaders = useMemo(() => buildHeadersList(call?.response_headers ?? {}), [call?.response_headers]);
  const responseCookies = useMemo(() => parseCookieHeader(call?.response_headers['set-cookie']), [call?.response_headers]);

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

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-full min-h-0 bg-muted">
      <ResizablePanel defaultSize={50} minSize={20}>
        <div className="flex flex-col h-full bg-background">
          <div className="bg-muted h-10 px-3 py-2 border-b flex items-center justify-between gap-2 min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-sm font-medium">
                Request
              </span>
              {call.method && <MethodBadge method={call.method} />}
              <span className="text-xs font-mono truncate text-muted-foreground" title={call.url}>
                {call.url}
              </span>
            </div>
          </div>

          {viewMode === 'text' ? (
            <div className="flex h-full min-h-0 flex-col p-2">
              <Label className="mb-1 block text-xs text-muted-foreground">
                Raw Request
              </Label>
              <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
                <TextEditor
                  language="javascript"
                  value={rawRequest}
                  options={{
                    readOnly: true,
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
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={20}>
        <div className="flex flex-col h-full bg-background">
          <div className="bg-muted h-10 px-3 py-2 border-b flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Response</span>
              {call.response_status && (
                <Badge variant={statusVariant} className="text-xs">
                  {call.response_status} {call.response_status_text}
                </Badge>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <EllipsisVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setViewMode(viewMode === 'table' ? 'text' : 'table')} className="text-xs">
                  {viewMode === 'table' ? (
                    <><FileText className="mr-2 h-4 w-4" /> Toggle Doc</>
                  ) : (
                    <><Table2 className="mr-2 h-4 w-4" /> Toggle Table</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleOpenInNewWindow} disabled={!call.response_status} className="text-xs">
                  <ExternalLink className="mr-2 h-4 w-4" /> Open in New Window
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSendToRepeater} className="text-xs">
                  <Send className="mr-2 h-4 w-4" /> Send to Repeater
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSendToInvoker} className="text-xs">
                  <Crosshair className="mr-2 h-4 w-4" /> Send to Invoker
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {viewMode === 'text' ? (
            <div className="flex h-full min-h-0 flex-col p-2">
              <Label className="mb-1 block text-xs text-muted-foreground">
                Raw Response
              </Label>
              <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
                <TextEditor
                  language="javascript"
                  value={rawResponse}
                  options={{
                    readOnly: true,
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
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
