import { useState, useEffect, useCallback } from 'react';
import { useCollectionsStore, type KeyValuePair } from '@/stores/collections';
import {
  getQueryParams,
  rebuildUrl as rebuildUrlHelper,
  getFormattedBody as formatBody,
  deriveActiveEndpoint,
} from './forge-utils';

export function useForgePanel() {
  const store = useCollectionsStore();
  const req = store.activeRequest;

  const [activeReqTab, setActiveReqTab] = useState('params');
  const [activeResTab, setActiveResTab] = useState('pretty');
  const [queryParams, setQueryParams] = useState<KeyValuePair[]>(() =>
    getQueryParams(req.url),
  );

  // Sync query params when URL changes externally
  useEffect(() => {
    setQueryParams(getQueryParams(req.url));
  }, [req.url]);

  // ── Query param helpers ──

  const rebuildUrl = useCallback(
    (params: KeyValuePair[]) => {
      rebuildUrlHelper(
        (url) => store.updateActiveRequest(() => ({ url })),
        req.url,
        params,
      );
    },
    [req.url, store],
  );

  const handleQueryParamChange = useCallback(
    (index: number, field: 'key' | 'value', value: string) => {
      setQueryParams((prev) => {
        const updated = prev.map((p, i) =>
          i === index ? { ...p, [field]: value } : p,
        );
        rebuildUrl(updated);
        return updated;
      });
    },
    [rebuildUrl],
  );

  const handleQueryParamToggle = useCallback(
    (index: number) => {
      setQueryParams((prev) => {
        const updated = prev.map((p, i) =>
          i === index ? { ...p, enabled: !p.enabled } : p,
        );
        rebuildUrl(updated);
        return updated;
      });
    },
    [rebuildUrl],
  );

  const handleAddQueryParam = useCallback(() => {
    setQueryParams((prev) => [
      ...prev,
      { key: '', value: '', enabled: true },
    ]);
  }, []);

  const handleRemoveQueryParam = useCallback(
    (index: number) => {
      setQueryParams((prev) => {
        const updated = prev.filter((_, i) => i !== index);
        rebuildUrl(updated);
        return updated;
      });
    },
    [rebuildUrl],
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
    (body: string) => store.updateActiveRequest(() => ({ body })),
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
