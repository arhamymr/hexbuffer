'use client';

import { useRouter } from 'next/navigation';
import { invoke } from '@tauri-apps/api/core';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Copy, ExternalLink, Plus, Eye, Trash2 } from 'lucide-react';
import type { DebugLog, ProxyLogEntry } from '@/hooks/useDebugLogs';
import { buildCurlCommand } from './constants';
import { useAppStore } from '@/stores/appStore';
import { useTrafficStore } from '@/stores/trafficStore';

interface LogEntryContextMenuProps {
  log: DebugLog;
  children: React.ReactNode;
  onToggle: () => void;
  activeTargetId?: string | null;
}

export function LogEntryContextMenu({ log, children, onToggle, activeTargetId }: LogEntryContextMenuProps) {
  const router = useRouter();
  const isProxyLog = log.type === 'proxy-log';
  const proxyData = isProxyLog ? log.data as ProxyLogEntry : null;

  const copyToClipboard = async (text: string | null | undefined) => {
    if (text) {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleCopyCurl = () => {
    if (proxyData) {
      copyToClipboard(buildCurlCommand(proxyData));
    }
  };

  const handleCopyUrl = () => {
    if (proxyData?.url) {
      const protocol = proxyData.port === 443 ? 'https' : 'http';
      const port = proxyData.port === 443 || proxyData.port === 80 ? '' : `:${proxyData.port}`;
      copyToClipboard(`${protocol}://${proxyData.host}${port}${proxyData.url}`);
    }
  };

  const handleCopyRequestHeaders = () => {
    if (proxyData?.request_headers) {
      const headersObj: Record<string, string> = {};
      for (const [k, v] of proxyData.request_headers) {
        headersObj[k] = v;
      }
      copyToClipboard(JSON.stringify(headersObj, null, 2));
    }
  };

  const handleCopyResponseBody = () => {
    if (proxyData?.response_body) {
      copyToClipboard(proxyData.response_body);
    }
  };

  const handleAddToScope = async () => {
    if (proxyData?.host && activeTargetId) {
      const host = proxyData.host.split(':')[0];
      try {
        await invoke('add_target_scope', {
          id: activeTargetId,
          scope: [`*.${host}`],
        });
      } catch (e) {
        console.error('Failed to add to scope:', e);
      }
    }
  };

  const handleOpenInRepeater = () => {
    if (proxyData) {
      const protocol = proxyData.port === 443 ? 'https' : 'http';
      const port = proxyData.port === 443 || proxyData.port === 80 ? '' : `:${proxyData.port}`;
      const fullUrl = `${protocol}://${proxyData.host}${port}${proxyData.url}`;

      const headersObj: Record<string, string> = {};
      if (proxyData.request_headers) {
        for (const [k, v] of proxyData.request_headers) {
          headersObj[k] = v;
        }
      }

      const request = {
        method: proxyData.method || 'GET',
        url: fullUrl,
        headers: headersObj,
        body: proxyData.request_body || '',
      };

      useAppStore.getState().setPendingRepeaterRequest(request);
      router.push('/repeater');
    }
  };

  const handleDelete = () => {
    const removeLog = useTrafficStore.getState().removeLog;
    removeLog(log.id);
  };

  if (!isProxyLog || !proxyData) {
    return <div onClick={onToggle}>{children}</div>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onContextMenu={(e) => e.stopPropagation()}>
        <div onClick={onToggle}>
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleCopyCurl}>
          <Copy className="mr-2 h-4 w-4" /> Copy as cURL
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyUrl}>
          <Copy className="mr-2 h-4 w-4" /> Copy URL
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyRequestHeaders} disabled={!proxyData.request_headers}>
          <Copy className="mr-2 h-4 w-4" /> Copy Request Headers
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyResponseBody} disabled={!proxyData.response_body}>
          <Copy className="mr-2 h-4 w-4" /> Copy Response Body
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleAddToScope} disabled={!activeTargetId}>
          <Plus className="mr-2 h-4 w-4" /> Add to Scope
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenInRepeater}>
          <ExternalLink className="mr-2 h-4 w-4" /> Open in Repeater
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