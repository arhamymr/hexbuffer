'use client';

import { useNavigate } from 'react-router-dom';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Copy, ExternalLink, Plus, Eye, Trash2, Send, FilePlus2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ApiCall } from '@/types';
import { deleteHistoryLog, fetchHistoryDetail } from '@/pages/http-history/services/history-service';
import { useBruteForceStore } from '@/stores/bruto-force';
import { useHistoryQuery } from '@/pages/http-history/hooks/use-history-query';
import { adaptProxyRecordToApiCall } from '@/pages/http-history/hooks/use-history-table';
import { useRepeaterStore } from '@/stores/repeater';
import { buildRawRequest } from '@/pages/repeater/types';
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
    let cmd = `curl -X ${call.method} '${call.url}'`;
    for (const [k, v] of Object.entries(call.headers)) {
      cmd += ` \\\n  -H '${k}: ${v}'`;
    }
    if (call.request_body) {
      cmd += ` \\\n  -d '${call.request_body}'`;
    }
    return cmd;
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

  const handleOpenInBruteForce = () => {
    const protocol = call.url.includes(':443') ? 'https' : 'http';
    const request = {
      method: call.method,
      url: `${protocol}://${call.host}${call.path}`,
      headers: call.headers,
      body: call.request_body || '',
      follow_redirects: true,
      max_hops: 10,
    };

    useBruteForceStore.getState().setPendingRequest(request);
    navigate('/brute-force');
  };

  const handleOpenInRepeater = async () => {
    try {
      const detail = await fetchHistoryDetail(call.id);
      const request = adaptProxyRecordToApiCall(detail);
      useRepeaterStore.getState().addRequestTab({
        raw: buildRawRequest({
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
        <ContextMenuItem onClick={handleCopyCurl}>
          <Copy className="mr-2 h-4 w-4" /> Copy as cURL
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyUrl}>
          <Copy className="mr-2 h-4 w-4" /> Copy URL
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyRequestHeaders}>
          <Copy className="mr-2 h-4 w-4" /> Copy Request Headers
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyResponseBody} disabled={!call.response_body}>
          <Copy className="mr-2 h-4 w-4" /> Copy Response Body
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleAddToScope}>
          <Plus className="mr-2 h-4 w-4" /> Add to Scope
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInBruteForce}>
          <ExternalLink className="mr-2 h-4 w-4" /> Open in Brute Force
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInRepeater}>
          <Send className="mr-2 h-4 w-4" /> Send to Repeater
        </ContextMenuItem>
        <ContextMenuItem onClick={handleSaveToDocuments}>
          <FilePlus2 className="mr-2 h-4 w-4" /> Save to Documents
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleInspect}>
          <Eye className="mr-2 h-4 w-4" /> Inspect
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
