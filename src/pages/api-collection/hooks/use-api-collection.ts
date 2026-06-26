import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useApiCollectionStore } from '@/stores/api-collection';
import { runScriptSandbox } from '../lib/script-sandbox';
import type { ForgeResponse, TestResult } from '../types';

export function useApiCollection() {
  const store = useApiCollectionStore();

  const getActiveVariables = useCallback((): Record<string, string> => {
    if (!store.activeContextId) return {};
    const context = store.contexts.find((c) => c.id === store.activeContextId);
    if (!context) return {};
    try {
      const vars: Array<{ key: string; value: string }> = JSON.parse(context.variables);
      const map: Record<string, string> = {};
      vars.forEach((v) => {
        if (v.key) map[v.key] = v.value;
      });
      return map;
    } catch {
      return {};
    }
  }, [store.contexts, store.activeContextId]);

  const expandVariables = useCallback((text: string, variables: Record<string, string>): string => {
    if (!text) return '';
    return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const trimmed = key.trim();
      return trimmed in variables ? variables[trimmed] : `{{${key}}}`;
    });
  }, []);

  const sendRequest = useCallback(async () => {
    const req = store.activeRequest;
    store.updateActiveRequest(() => ({ isLoading: true, error: null, response: null, testResults: [] }));

    try {
      const variables = getActiveVariables();

      // 1. Pre-request script execution
      let updatedVariables = { ...variables };
      if (req.preScript) {
        const preResult = runScriptSandbox(
          req.preScript,
          variables,
          {
            url: req.url,
            method: req.method,
            headers: {},
            body: req.body,
          },
          null
        );
        updatedVariables = preResult.updatedVariables;
      }

      // 2. Variable expansion in URL, headers, and body
      const expandedUrl = expandVariables(req.url, updatedVariables);
      
      const reqHeaders: Record<string, string> = {};
      req.headers.forEach((h) => {
        if (h.enabled && h.key) {
          reqHeaders[expandVariables(h.key, updatedVariables)] = expandVariables(h.value, updatedVariables);
        }
      });

      const expandedBody = expandVariables(req.body, updatedVariables);

      // 3. Dispatch native HTTP request to bypass CORS
      const res = await invoke<ForgeResponse>('send_forge_request', {
        request: {
          method: req.method,
          url: expandedUrl,
          headers: reqHeaders,
          body: expandedBody,
        },
      });

      // 4. Test script assertions evaluation
      let testResults: TestResult[] = [];
      if (req.testScript) {
        const testResult = runScriptSandbox(
          req.testScript,
          updatedVariables,
          {
            url: expandedUrl,
            method: req.method,
            headers: reqHeaders,
            body: expandedBody,
          },
          {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
            body: res.body,
          }
        );
        testResults = testResult.testResults;
        
        // Persist test script environment variable updates
        if (store.activeContextId) {
          const currentContext = store.contexts.find((c) => c.id === store.activeContextId);
          if (currentContext) {
            const currentVars: Array<{ key: string; value: string }> = JSON.parse(currentContext.variables);
            const mergedVars = currentVars.map(v => {
              if (v.key in testResult.updatedVariables) {
                return { key: v.key, value: testResult.updatedVariables[v.key] };
              }
              return v;
            });
            Object.keys(testResult.updatedVariables).forEach(k => {
              if (!currentVars.some(v => v.key === k)) {
                mergedVars.push({ key: k, value: testResult.updatedVariables[k] });
              }
            });
            await store.updateContext(currentContext.id, currentContext.name, mergedVars);
          }
        }
      }

      // 5. Update UI state and persist history logs
      store.updateActiveRequest(() => ({
        isLoading: false,
        response: res,
        testResults,
      }));

      await store.addChronicleRecord(
        req.method,
        expandedUrl,
        JSON.stringify(reqHeaders),
        expandedBody,
        res
      );

    } catch (e: any) {
      store.updateActiveRequest(() => ({
        isLoading: false,
        error: e.message || String(e),
      }));
    }
  }, [store.activeRequest, getActiveVariables, expandVariables, store.activeContextId, store.contexts]);

  // ── UI state ──
  const [contextsDialogOpen, setContextsDialogOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  // Load all initial data from DB on mount
  useEffect(() => {
    void store.fetchFromDb();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tab handlers ──
  const handleTabRename = useCallback(async (id: string, newName: string) => {
    await store.renameStash(id, newName);
  }, [store]);

  const handleTabAdd = useCallback(async () => {
    const nextNum = store.stashes.length + 1;
    const name = `Collection ${nextNum}`;
    await store.createStash(name);
  }, [store]);

  const handleTabClose = useCallback(async (id: string) => {
    const stash = store.stashes.find((s) => s.id === id);
    if (stash && confirm(`Are you sure you want to delete the collection "${stash.name}" and all its API requests?`)) {
      await store.deleteStash(id);
    }
  }, [store]);

  const handleCreateInitialRequest = useCallback(async () => {
    if (store.activeStashId) {
      await store.createEndpoint(store.activeStashId, 'New Request');
    }
  }, [store]);

  // Map stashes to PageTabItem format
  const pageTabs = store.stashes.map((s) => ({ id: s.id, name: s.name }));

  return {
    stashes: store.stashes,
    activeStashId: store.activeStashId,
    setActiveStashId: store.setActiveStashId,
    stashEndpoints: store.stashEndpoints,
    activeEndpointId: store.activeEndpointId,
    setActiveEndpointId: store.setActiveEndpointId,
    activeRequest: store.activeRequest,
    updateActiveRequest: store.updateActiveRequest,
    sendRequest,
    saveActiveEndpoint: store.saveActiveEndpoint,
    contexts: store.contexts,
    activeContextId: store.activeContextId,
    setActiveContextId: store.setActiveContextId,
    chronicleLogs: store.chronicleLogs,
    pageTabs,
    contextsDialogOpen,
    setContextsDialogOpen,
    sidebarExpanded,
    setSidebarExpanded,
    handleTabRename,
    handleTabAdd,
    handleTabClose,
    handleCreateInitialRequest,
  };
}
