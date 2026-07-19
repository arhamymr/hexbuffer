import { useState, useCallback } from 'react';
import { useCollectionsStore, type KeyValuePair } from '@/stores/collections';
import {
  getFormattedBody as formatBody,
  deriveActiveEndpoint,
} from './forge-utils';

export function useForgePanel() {
  const store = useCollectionsStore();
  const req = store.activeRequest;

  const [activeReqTab, setActiveReqTab] = useState('params');
  const [activeResTab, setActiveResTab] = useState('pretty');

  // Query params live in the store — same pattern as headers.
  // The URL and query params are independent fields; they are only
  // combined into the final URL when the request is sent.
  const queryParams = req.queryParams;

  // ── Query param helpers ──

  const handleQueryParamChange = useCallback(
    (index: number, field: 'key' | 'value', value: string) => {
      store.updateActiveRequest((current) => {
        const updated = [...current.queryParams];
        updated[index] = { ...updated[index], [field]: value };
        return { queryParams: updated };
      });
    },
    [store],
  );

  const handleQueryParamToggle = useCallback(
    (index: number) => {
      store.updateActiveRequest((current) => {
        const updated = [...current.queryParams];
        updated[index] = {
          ...updated[index],
          enabled: !updated[index].enabled,
        };
        return { queryParams: updated };
      });
    },
    [store],
  );

  const handleAddQueryParam = useCallback(() => {
    store.updateActiveRequest((current) => ({
      queryParams: [...current.queryParams, { key: '', value: '', enabled: true }],
    }));
  }, [store]);

  const handleRemoveQueryParam = useCallback(
    (index: number) => {
      store.updateActiveRequest((current) => ({
        queryParams: current.queryParams.filter((_, i) => i !== index),
      }));
    },
    [store],
  );

  // ── Header handlers (delegate to store) ──

  const handleHeaderChange = useCallback(
    (index: number, field: 'key' | 'value', value: string) => {
      store.updateActiveRequest((current) => {
        const updated = [...current.headers];
        updated[index] = { ...updated[index], [field]: value };
        return { headers: updated };
      });
    },
    [store],
  );

  const handleHeaderToggle = useCallback(
    (index: number) => {
      store.updateActiveRequest((current) => {
        const updated = [...current.headers];
        updated[index] = {
          ...updated[index],
          enabled: !updated[index].enabled,
        };
        return { headers: updated };
      });
    },
    [store],
  );

  const handleAddHeader = useCallback(() => {
    store.updateActiveRequest((current) => ({
      headers: [
        ...current.headers,
        { key: '', value: '', enabled: true },
      ],
    }));
  }, [store]);

  const handleRemoveHeader = useCallback(
    (index: number) => {
      store.updateActiveRequest((current) => ({
        headers: current.headers.filter((_, i) => i !== index),
      }));
    },
    [store],
  );

  // ── Simple store mutation handlers ──

  const handleMethodChange = useCallback(
    (method: string) => store.updateActiveRequest(() => ({ method })),
    [store],
  );

  const handleUrlChange = useCallback(
    (url: string) => store.updateActiveRequest(() => ({ url })),
    [store],
  );

  const handleBodyTypeChange = useCallback(
    (bodyType: string) =>
      store.updateActiveRequest(() => ({ bodyType: bodyType as any })),
    [store],
  );

  const handleBodyChange = useCallback(
    (body: string, contentType?: string) => {
      store.updateActiveRequest((current) => {
        const next: Partial<typeof current> = { body };
        if (contentType) {
          // ponytail: update or append Content-Type header when uploading file/image
          const headers = [...current.headers];
          const ctIndex = headers.findIndex(
            (h) => h.key.toLowerCase() === 'content-type'
          );
          if (ctIndex !== -1) {
            headers[ctIndex] = { ...headers[ctIndex], value: contentType, enabled: true };
          } else {
            headers.push({ key: 'Content-Type', value: contentType, enabled: true });
          }
          next.headers = headers;
        }
        return next;
      });
    },
    [store],
  );

  const handlePreScriptChange = useCallback(
    (preScript: string) =>
      store.updateActiveRequest(() => ({ preScript })),
    [store],
  );

  const handleTestScriptChange = useCallback(
    (testScript: string) =>
      store.updateActiveRequest(() => ({ testScript })),
    [store],
  );

  // ── Derived state ──

  const activeEndpoint = deriveActiveEndpoint(
    store.endpoints,
    store.selectedNodeId,
  );

  const getFormattedBody = useCallback(
    () => formatBody(req.response?.body ?? ''),
    [req.response?.body],
  );

  return {
    req,
    queryParams,
    activeReqTab,
    setActiveReqTab,
    activeResTab,
    setActiveResTab,
    activeEndpoint,
    handleQueryParamChange,
    handleQueryParamToggle,
    handleAddQueryParam,
    handleRemoveQueryParam,
    handleHeaderChange,
    handleHeaderToggle,
    handleAddHeader,
    handleRemoveHeader,
    handleMethodChange,
    handleUrlChange,
    handleBodyTypeChange,
    handleBodyChange,
    handlePreScriptChange,
    handleTestScriptChange,
    getFormattedBody,
  };
}
