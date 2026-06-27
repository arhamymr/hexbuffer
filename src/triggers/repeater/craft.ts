import { useCollectionsStore } from '@/stores/collections';
import { runScriptSandbox } from '../../pages/repeater/lib/script-sandbox';

function getActiveVariables(): Record<string, string> {
  const store = useCollectionsStore.getState();
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

    // 2. Variable expansion
    const expandedUrl = expandVars(req.url, updatedVariables);
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
          const currentVars: Array<{ key: string; value: string }> = JSON.parse(
            currentContext.variables,
          );
          const mergedVars = currentVars.map((v) => {
            if (v.key in testResult.updatedVariables) {
              return {
                key: v.key,
                value: testResult.updatedVariables[v.key],
                enabled: true,
              };
            }
            return { ...v, enabled: true };
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
