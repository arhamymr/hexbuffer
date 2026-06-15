'use client';

import { useCallback, memo } from 'react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Copy, Plus, Trash2, Send, FilePlus2, Pin, PinOff } from 'lucide-react';
import { toast } from 'sonner';
import type { ApiCall } from '@/types';
import { deleteHistoryLog, fetchHistoryDetail } from '@/pages/live-traffic/services/history-service';
import { createDefaultAttackConfig, findRequestPayloadPositions } from '@/pages/invoker/types';
import { useInvokerStore } from '@/stores/invoker';
import { useDocumentsStore } from '@/stores/documents';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { useHistoryQuery } from '@/pages/live-traffic/hooks/use-history-query';
import { adaptProxyRecordToApiCall } from '@/pages/live-traffic/hooks/use-history-table';
import { useRepeaterStore } from '@/stores/repeater';
import { buildHttpCurlCommand, buildRawHttpRequest } from '@/lib/http-message';
import { copyText } from '@/lib/clipboard';
import { useTargetStore } from '@/stores/target';
import { useNavStore } from '@/stores/nav';
import { useInterceptStore } from '@/pages/intercept/state/intercept-store';
import { usePinnedRequestsStore } from '@/pages/live-traffic/state/pinned-requests-store';

interface LogEntryContextMenuProps {
  call: ApiCall;
  children: React.ReactNode;
  onDelete?: (id: string) => void;
  onOpenChange?: (open: boolean) => void;
}

function buildAutomationTargetUrl(request: ApiCall) {
  try {
    return new URL(request.url).origin;
  } catch {
    const host = request.host || request.url.replace(/^https?:\/\//i, '').split('/')[0];
    return host ? `https://${host}` : request.url;
  }
}

export const LogEntryContextMenu = memo(function LogEntryContextMenu({
  call,
  children,
  onDelete,
  onOpenChange,
}: LogEntryContextMenuProps) {
  const { triggerRefresh } = useHistoryQuery();
  const togglePin = usePinnedRequestsStore((s) => s.togglePin);
  const isPinned = usePinnedRequestsStore((s) => s.isPinned);
  const pinned = isPinned(call.id);

  const handleCopyCurlCommand = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      const curl = buildHttpCurlCommand({
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.request_body ?? '',
      });
      if (await copyText(curl)) toast.success('Copied as curl command (bash)');
      else toast.error('Failed to copy as curl command (bash)');
    } catch (error) {
      console.error('Failed to copy curl command:', error);
      toast.error('Failed to copy as curl command (bash)');
    }
  }, [call.id]);

  const handleTogglePin = useCallback(() => {
    togglePin(call);
  }, [call, togglePin]);

  const handleCopyUrl = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      if (await copyText(request.url)) toast.success('Copied URL');
      else toast.error('Failed to copy URL');
    } catch {
      if (await copyText(call.url)) toast.success('Copied URL');
      else toast.error('Failed to copy URL');
    }
  }, [call.id, call.url]);

  const handleAddToScope = useCallback(() => {
    const target = useTargetStore.getState().addHostTarget(call.host);

    if (!target) {
      toast.error('Host is unavailable');
      return;
    }

    toast.success(`Added ${target.name} to targets`);
  }, [call.host]);

  const handleOpenInInvoker = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      const baseRequest = {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.request_body || '',
        follow_redirects: true,
        max_hops: 10,
      };
      const config = {
        ...createDefaultAttackConfig(),
        name: `${request.method} ${request.path || request.url}`,
        base_request: baseRequest,
        positions: findRequestPayloadPositions(baseRequest),
      };

      useInvokerStore.getState().addAttackTab(config);
      useNavStore.getState().triggerNavBlink('/invoker');
      toast.success(`Sent ${request.method} ${request.path || request.url} to Invoker`);
    } catch (error) {
      console.error('Failed to open request in Invoker:', error);
      toast.error('Failed to open request in Invoker');
    }
  }, [call.id]);

  const handleOpenInRepeater = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      useRepeaterStore.getState().addRequestTab({
        raw: buildRawHttpRequest({
          method: request.method,
          url: request.url,
          headers: request.headers,
          body: request.request_body || '',
        }),
        url: request.url,
      });
      useNavStore.getState().triggerNavBlink('/repeater');
      toast.success(`Sent ${request.method} ${request.path || request.url} to Repeater`);
    } catch (error) {
      console.error('Failed to open request in Repeater:', error);
      toast.error('Failed to open request in Repeater');
    }
  }, [call.id]);

  const handleSendToIntercept = useCallback(() => {
    const host = call.host?.trim();

    if (!host) {
      toast.error('Host is unavailable');
      return;
    }

    useInterceptStore.getState().addTabForHost(host);
    useNavStore.getState().triggerNavBlink('/intercept');
    toast.success(`Intercept tab created for ${host}`);
  }, [call.host]);

  const handleOpenInBrowserAutomation = useCallback(async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      const targetUrl = buildAutomationTargetUrl(request);

      useBrowserAutomationStore.getState().addAutomationTab(
        { targetUrl },
        request.host || targetUrl
      );
      useNavStore.getState().triggerNavBlink('/browser-automation');
      toast.success(`Sent ${request.host || targetUrl} to Browser Automation`);
    } catch (error) {
      console.error('Failed to open target in Browser Automation:', error);
      toast.error('Failed to open target in Browser Automation');
    }
  }, [call.id]);

  // const handleOpenInPromptInjection = async () => {
  //   try {
  //     const detail = await fetchHistoryDetail(call.id);
  //     const request = adaptProxyRecordToApiCall(detail);
  //     navigate('/ai-tools', {
  //       state: {
  //         promptInjectionRequest: {
  //           raw: buildRawHttpRequest({
  //             method: request.method,
  //             url: request.url,
  //             headers: request.headers,
  //             body: request.request_body || '',
  //           }),
  //           endpoint: request.url,
  //         },
  //       },
  //     });
  //   } catch (error) {
  //     console.error('Failed to open request in Prompt Injection:', error);
  //     toast.error('Failed to open request in Prompt Injection');
  //   }
  // };

  const handleSaveToDocuments = async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);

      useDocumentsStore.getState().addApiEntryToActiveDocument({
        sourceHistoryId: request.id,
        method: request.method,
        url: request.url,
        host: request.host,
        path: request.path,
        headers: request.headers,
        requestBody: request.request_body,
        responseStatus: request.response_status,
        responseContentType: request.response_content_type,
        capturedAt: request.timestamp,
      });
      toast.success('Saved API to active document');
    } catch (error) {
      console.error('Failed to save API to documents:', error);
      toast.error('Failed to save API to documents');
    }
  };

  const handleDelete = useCallback(async () => {
    try {
      await deleteHistoryLog(call.id);
      usePinnedRequestsStore.getState().unpinId(call.id);
      onDelete?.(call.id);
      triggerRefresh();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  }, [call.id, onDelete, triggerRefresh]);

  return (
    <ContextMenu onOpenChange={onOpenChange}>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleCopyCurlCommand} className='text-xs'>
          <Copy className="mr-2 size-3" /> Copy as curl command (bash)
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyUrl} className='text-xs'>
          <Copy className="mr-2 size-3" /> Copy URL
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleTogglePin} className='text-xs'>
          {pinned
            ? <><PinOff className="mr-2 size-3" /> Unpin</>
            : <><Pin className="mr-2 size-3" /> Pin</>
          }
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleAddToScope} className='text-xs'>
          <Plus className="mr-2 size-3" /> Add to Target
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInInvoker} className='text-xs'>
          <Send className="mr-2 size-3" /> Send to Invoker
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInRepeater} className='text-xs'>
          <Send className="mr-2 size-3" /> Send to Repeater
        </ContextMenuItem>
        <ContextMenuItem onClick={handleSendToIntercept} className='text-xs'>
          <Send className="mr-2 size-3" /> Send to Intercept
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInBrowserAutomation} className='text-xs'>
          <Send className="mr-2 size-3" /> Send to Automate Browser
        </ContextMenuItem>
        {/* <ContextMenuItem onClick={handleOpenInPromptInjection} className='text-xs'>
          <Bot className="mr-2 size-4" /> Open in Prompt Injection
        </ContextMenuItem> */}
        <ContextMenuItem onClick={handleSaveToDocuments} className='text-xs'>
          <FilePlus2 className="mr-2 size-4" /> Save to Documents
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} variant="destructive" className='text-xs'>
          <Trash2 className="mr-2 size-3" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
