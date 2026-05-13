'use client';

import { useNavigate } from 'react-router-dom';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Copy, ExternalLink, Plus, Eye, Trash2, Send } from 'lucide-react';
import type { ApiCall } from '@/types';
import { useAppStore } from '@/stores/app';
import { useProxyStore } from '@/stores/proxyStore';

interface LogEntryContextMenuProps {
  call: ApiCall;
  children: React.ReactNode;
  onToggle: () => void;
  activeTargetId?: string | null;
}

export function LogEntryContextMenu({
  call,
  children,
  onToggle,
  activeTargetId,
}: LogEntryContextMenuProps) {
  const navigate = useNavigate();

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
    };

    useAppStore.getState().setPendingBruteForceRequest(request);
    navigate('/brute-force');
  };

  const handleOpenInRepeater = () => {
    const protocol = call.url.includes(':443') ? 'https' : 'http';
    const url = `${protocol}://${call.host}${call.path}`;
    const headersString = Object.entries(call.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    console.log('Open in Repeater:', { method: call.method, url, headers: headersString });
    navigate('/repeater');
  };

  const handleDelete = () => {
    const calls = useProxyStore.getState().calls;
    useProxyStore.setState({ calls: calls.filter((c) => c.id !== call.id) });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onContextMenu={(e) => e.stopPropagation()}>
        <div onClick={onToggle} className="contents">{children}</div>
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
        <ContextMenuItem onClick={handleAddToScope} disabled={!activeTargetId}>
          <Plus className="mr-2 h-4 w-4" /> Add to Scope
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInBruteForce}>
          <ExternalLink className="mr-2 h-4 w-4" /> Open in Brute Force
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInRepeater}>
          <Send className="mr-2 h-4 w-4" /> Open in Repeater
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onToggle}>
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