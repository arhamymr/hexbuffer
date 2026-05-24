'use client';

import { useNavigate } from 'react-router-dom';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Bot, Copy, ExternalLink, Plus, Eye, Trash2, Send, FilePlus2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ApiCall } from '@/types';
import { deleteHistoryLog, fetchHistoryDetail } from '@/pages/http-history/services/history-service';
import { createDefaultAttackConfig, findRequestPayloadPositions } from '@/pages/brute-force/types';
import { useBruteForceStore } from '@/stores/bruto-force';
import { useHistoryQuery } from '@/pages/http-history/hooks/use-history-query';
import { adaptProxyRecordToApiCall } from '@/pages/http-history/hooks/use-history-table';
import { useRepeaterStore } from '@/stores/repeater';
import { buildHttpCurlCommand, buildRawHttpRequest } from '@/lib/http-message';
import { useDocumentsStore } from '@/stores/documents';

interface LogEntryContextMenuProps {
  call: ApiCall;
  children: React.ReactNode;
  onDelete?: (id: string) => void;
}

export function LogEntryContextMenu({
  call,
  children,
  onDelete,
}: LogEntryContextMenuProps) {
  const navigate = useNavigate();
  const { setSelectedCallId, triggerRefresh } = useHistoryQuery();

  const copyToClipboard = async (text: string | null | undefined) => {
    if (text) {
      await navigator.clipboard.writeText(text);
    }
  };

  const buildCurlCommand = (call: ApiCall): string => {
    return buildHttpCurlCommand({
      method: call.method,
      url: call.url,
      headers: call.headers,
      body: call.request_body ?? '',
    });
  };

  const handleCopyCurl = () => {
    copyToClipboard(buildCurlCommand(call));
  };

  const handleCopyUrl = () => {
    const port = call.url.includes(':443') ? 443 : 80;
    const protocol = port === 443 ? 'https' : 'http';
    copyToClipboard(`${protocol}://${call.host}${call.path}`);
  };

  const handleCopyRequestHeaders = () => {
    copyToClipboard(JSON.stringify(call.headers, null, 2));
  };

  const handleCopyResponseBody = () => {
    copyToClipboard(call.response_body);
  };

  const handleAddToScope = async () => {
    console.log('Add to scope not available in dev mode');
  };

  const handleOpenInBruteForce = async () => {
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

      useBruteForceStore.getState().addAttackTab(config);
      navigate('/brute-force');
    } catch (error) {
      console.error('Failed to open request in Brute Force:', error);
      toast.error('Failed to open request in Brute Force');
    }
  };

  const handleOpenInRepeater = async () => {
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
      navigate('/repeater');
    } catch (error) {
      console.error('Failed to open request in Repeater:', error);
    }
  };

  const handleOpenInPromptInjection = async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      navigate('/ai-tools', {
        state: {
          promptInjectionRequest: {
            raw: buildRawHttpRequest({
              method: request.method,
              url: request.url,
              headers: request.headers,
              body: request.request_body || '',
            }),
            endpoint: request.url,
          },
        },
      });
    } catch (error) {
      console.error('Failed to open request in Prompt Injection:', error);
      toast.error('Failed to open request in Prompt Injection');
    }
  };

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

  const handleDelete = async () => {
    try {
      await deleteHistoryLog(call.id);
      onDelete?.(call.id);
      triggerRefresh();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleInspect = () => {
    setSelectedCallId(call.id);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleCopyCurl} className='text-xs'>
          <Copy className="mr-2 size-3" /> Copy as cURL
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyUrl} className='text-xs'>
          <Copy className="mr-2 size-3" /> Copy URL
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyRequestHeaders} className='text-xs'>
          <Copy className="mr-2 size-3" /> Copy Request Headers
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyResponseBody} disabled={!call.response_body} className='text-xs'>
          <Copy className="mr-2 size-3" /> Copy Response Body
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleAddToScope} className='text-xs'>
          <Plus className="mr-2 h-4 w-4" /> Add to Scope
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInBruteForce} className='text-xs'>
          <ExternalLink className="mr-2 h-4 w-4" /> Open in Brute Force
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInRepeater} className='text-xs'>
          <Send className="mr-2 h-4 w-4" /> Send to Repeater
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInPromptInjection} className='text-xs'>
          <Bot className="mr-2 h-4 w-4" /> Open in Prompt Injection
        </ContextMenuItem>
        <ContextMenuItem onClick={handleSaveToDocuments} className='text-xs'>
          <FilePlus2 className="mr-2 h-4 w-4" /> Save to Documents
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleInspect} className='text-xs'>
          <Eye className="mr-2 h-4 w-4" /> Inspect
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} variant="destructive" className='text-xs'>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
