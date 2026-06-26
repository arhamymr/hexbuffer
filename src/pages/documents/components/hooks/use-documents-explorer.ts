import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useInvokerStore } from '@/stores/invoker';
import { useRepeaterStore } from '@/stores/repeater';
import { buildHttpCurlCommand, buildRawHttpRequest } from '@/lib/http-message';
import { copyText } from '@/lib/clipboard';
import { createDefaultAttackConfig, findRequestPayloadPositions } from '@/pages/invoker/types';
import { type SavedApiEntry } from '../../types';
import { type DragEndEvent } from '@dnd-kit/react';
import { isSortable } from '@dnd-kit/react/sortable';

interface UseDocumentsExplorerProps {
  onReorderCustomSections: (fromIndex: number, toIndex: number) => void;
}

export function useDocumentsExplorer({ onReorderCustomSections }: UseDocumentsExplorerProps) {
  const navigate = useNavigate();

  const handleCopyCurlCommand = React.useCallback((entry: SavedApiEntry) => {
    const curl = buildHttpCurlCommand({
      method: entry.method,
      url: entry.url,
      headers: entry.headers,
      body: entry.requestBody ?? '',
    });
    copyText(curl).then((ok) => {
      if (ok) toast.success('Copied as curl command (bash)');
      else toast.error('Failed to copy as curl command (bash)');
    });
  }, []);

  const handleCopyUrl = React.useCallback((entry: SavedApiEntry) => {
    copyText(entry.url).then((ok) => {
      if (ok) toast.success('Copied URL');
      else toast.error('Failed to copy URL');
    });
  }, []);

  const handleOpenInInvoker = React.useCallback((entry: SavedApiEntry) => {
    const baseRequest = {
      method: entry.method,
      url: entry.url,
      headers: entry.headers,
      body: entry.requestBody ?? '',
      follow_redirects: true,
      max_hops: 10,
    };
    const config = {
      ...createDefaultAttackConfig(),
      name: `${entry.method} ${entry.path || entry.url}`,
      base_request: baseRequest,
      positions: findRequestPayloadPositions(baseRequest),
    };
    useInvokerStore.getState().addAttackTab(config);
    navigate('/invoker');
    toast.success('Opened in Invoker');
  }, [navigate]);

  const handleOpenInRepeater = React.useCallback((entry: SavedApiEntry) => {
    useRepeaterStore.getState().addRequestTab({
      raw: buildRawHttpRequest({
        method: entry.method,
        url: entry.url,
        headers: entry.headers,
        body: entry.requestBody ?? '',
      }),
      url: entry.url,
    });
    navigate('/repeater');
    toast.success('Sent to Repeater');
  }, [navigate]);

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { source, target } = event.operation;
      if (!isSortable(source) || !isSortable(target)) return;
      const fromIndex = source.index;
      const toIndex = target.index;
      if (fromIndex !== toIndex) {
        onReorderCustomSections(fromIndex, toIndex);
      }
    },
    [onReorderCustomSections]
  );

  return {
    handleCopyCurlCommand,
    handleCopyUrl,
    handleOpenInInvoker,
    handleOpenInRepeater,
    handleDragEnd,
  };
}
