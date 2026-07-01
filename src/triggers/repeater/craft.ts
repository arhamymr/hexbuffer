import { useCollectionsStore, type KeyValuePair } from '@/stores/collections';
import { runScriptSandbox } from '../../pages/repeater/lib/script-sandbox';

function buildUrlWithQueryParams(baseUrl: string, params: KeyValuePair[]): string {
  try {
    const urlWithoutQuery = baseUrl.split('?')[0];
    const activeParams = params.filter((p) => p.enabled && p.key);
    if (activeParams.length === 0) return urlWithoutQuery;
    const query = activeParams
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    return `${urlWithoutQuery}?${query}`;
  } catch {
    return baseUrl;
  }
}

function getActiveVariables(): Record<string, string> {
  const store = useCollectionsStore.getState();
  if (!store.activeContextId) return {};
  const context = store.contexts.find((c) => c.id === store.activeContextId);
  if (!context) return {};
  try {
    const vars: Array<{ key: string; value: string; enabled?: boolean }> = JSON.parse(context.variables);
    const map: Record<string, string> = {};
    vars.forEach((v) => {
      if (v.key && v.enabled !== false) map[v.key] = v.value;
    });
    return map;
  } catch {
    return {};
  }
}

function expandVars(text: string, vars: Record<string, string>): string {
  if (!text) return '';
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const trimmed = key.trim();
    return trimmed in vars ? vars[trimmed] : `{{${key}}}`;
  });
}

export async function sendCraftRequest(): Promise<void> {
  const store = useCollectionsStore.getState();
  const req = store.activeRequest;

  store.updateActiveRequest(() => ({
    isLoading: true,
    error: null,
    response: null,
    testResults: [],
  }));

  try {
    const variables = getActiveVariables();

    // 1. Pre-request script
    let updatedVariables = { ...variables };
    if (req.preScript) {
      const preResult = runScriptSandbox(
        req.preScript,
        variables,
        { url: req.url, method: req.method, headers: {}, body: req.body },
        null,
      );
      updatedVariables = preResult.updatedVariables;
    }

    // 2. Build final URL: expand variables in base URL and query parameters first, then combine them
    // ponytail: this prevents curly braces in variable placeholders (e.g. {{var}}) from being encoded as %7B%7Bvar%7D%7D and failing to resolve.
    const expandedBaseUrl = expandVars(req.url, updatedVariables);
    const expandedQueryParams = req.queryParams.map((p) => ({
      ...p,
      key: expandVars(p.key, updatedVariables),
      value: expandVars(p.value, updatedVariables),
    }));
    const expandedUrl = buildUrlWithQueryParams(expandedBaseUrl, expandedQueryParams);
    const reqHeaders: Record<string, string> = {};
    req.headers.forEach((h) => {
      if (h.enabled && h.key) {
        reqHeaders[expandVars(h.key, updatedVariables)] = expandVars(h.value, updatedVariables);
      }
    });
    const expandedBody = expandVars(req.body, updatedVariables);

    // 3. Send via native HTTP
    const res = await store.sendForgeRequest({
      method: req.method,
      url: expandedUrl,
      headers: reqHeaders,
      body: expandedBody,
    });

    // 4. Test script
    let testResults: typeof store.activeRequest.testResults = [];
    if (req.testScript) {
      const testResult = runScriptSandbox(
        req.testScript,
        updatedVariables,
        { url: expandedUrl, method: req.method, headers: reqHeaders, body: expandedBody },
        { status: res.status, statusText: res.statusText, headers: res.headers, body: res.body },
      );
      testResults = testResult.testResults;

      // Persist test script variable updates
      const currentStore = useCollectionsStore.getState();
      if (currentStore.activeContextId) {
        const currentContext = currentStore.contexts.find(
          (c) => c.id === currentStore.activeContextId,
        );
        if (currentContext) {
          const currentVars: Array<{ key: string; value: string; enabled?: boolean }> = JSON.parse(
            currentContext.variables,
          );
          const mergedVars = currentVars.map((v) => {
            const isEnabled = typeof v.enabled === 'boolean' ? v.enabled : true;
            if (v.key in testResult.updatedVariables) {
              return {
                key: v.key,
                value: testResult.updatedVariables[v.key],
                enabled: isEnabled,
              };
            }
            return { ...v, enabled: isEnabled };
          });
          Object.keys(testResult.updatedVariables).forEach((k) => {
            if (!currentVars.some((v) => v.key === k)) {
              mergedVars.push({
                key: k,
                value: testResult.updatedVariables[k],
                enabled: true,
              });
            }
          });
          await currentStore.updateContext(currentContext.id, currentContext.name, mergedVars);
        }
      }
    }

    // 5. Update UI and chronicle
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
      res,
    );
  } catch (e: unknown) {
    const err = e as Error;
    store.updateActiveRequest(() => ({
      isLoading: false,
      error: err?.message || String(e),
    }));
  }
}

export async function saveActiveEndpoint(): Promise<void> {
  await useCollectionsStore.getState().saveActiveEndpoint();
}
