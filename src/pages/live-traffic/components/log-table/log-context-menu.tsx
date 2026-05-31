'use client';

import { useNavigate } from 'react-router-dom';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Copy, Plus, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { ApiCall } from '@/types';
import { deleteHistoryLog, fetchHistoryDetail } from '@/pages/live-traffic/services/history-service';
import { createDefaultAttackConfig, findRequestPayloadPositions } from '@/pages/brute-force/types';
import { useBruteForceStore } from '@/stores/bruto-force';
import { useHistoryQuery } from '@/pages/live-traffic/hooks/use-history-query';
import { adaptProxyRecordToApiCall } from '@/pages/live-traffic/hooks/use-history-table';
import { useRepeaterStore } from '@/stores/repeater';
import { buildHttpCurlCommand, buildRawHttpRequest } from '@/lib/http-message';
import { copyText } from '@/lib/clipboard';
import { useDocumentsStore } from '@/stores/documents';
import { useTargetStore } from '@/stores/target';

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
  const { triggerRefresh } = useHistoryQuery();

  const handleCopyCurlCommand = async () => {
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
  };

  const handleCopyUrl = async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      if (await copyText(request.url)) toast.success('Copied URL');
      else toast.error('Failed to copy URL');
    } catch {
      if (await copyText(call.url)) toast.success('Copied URL');
      else toast.error('Failed to copy URL');
    }
  };

  const handleAddToScope = async () => {
    const target = useTargetStore.getState().addHostTarget(call.host);

    if (!target) {
      toast.error('Host is unavailable');
      return;
    }

    toast.success(`Added ${target.name} to targets`);
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

  // const handleSaveToDocuments = async () => {
  //   try {
  //     const detail = await fetchHistoryDetail(call.id);
  //     const request = adaptProxyRecordToApiCall(detail);

  //     useDocumentsStore.getState().addApiEntryToActiveDocument({
  //       sourceHistoryId: request.id,
  //       method: request.method,
  //       url: request.url,
  //       host: request.host,
  //       path: request.path,
  //       headers: request.headers,
  //       requestBody: request.request_body,
  //       responseStatus: request.response_status,
  //       responseContentType: request.response_content_type,
  //       capturedAt: request.timestamp,
  //     });
  //     toast.success('Saved API to active document');
  //   } catch (error) {
  //     console.error('Failed to save API to documents:', error);
  //     toast.error('Failed to save API to documents');
  //   }
  // };

  const handleDelete = async () => {
    try {
      await deleteHistoryLog(call.id);
      onDelete?.(call.id);
      triggerRefresh();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  return (
    <ContextMenu>
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
        <ContextMenuItem onClick={handleAddToScope} className='text-xs'>
          <Plus className="mr-2 h-4 w-4" /> Add to Target
        </ContextMenuItem>
        {/* <ContextMenuItem onClick={handleOpenInBruteForce} className='text-xs'>
          <ExternalLink className="mr-2 h-4 w-4" /> Open in Brute Force
        </ContextMenuItem> */}
        <ContextMenuItem onClick={handleOpenInRepeater} className='text-xs'>
          <Send className="mr-2 h-4 w-4" /> Send to Repeater
        </ContextMenuItem>
        {/* <ContextMenuItem onClick={handleOpenInPromptInjection} className='text-xs'>
          <Bot className="mr-2 h-4 w-4" /> Open in Prompt Injection
        </ContextMenuItem> */}
        {/* <ContextMenuItem onClick={handleSaveToDocuments} className='text-xs'>
          <FilePlus2 className="mr-2 h-4 w-4" /> Save to Documents
        </ContextMenuItem> */}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} variant="destructive" className='text-xs'>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
