import { z } from 'zod';

export const getProxyRequestDef = {
  description: 'Get details of a specific proxy HTTP request by its log ID. Returns method, URL, headers, body, and response info. Use this to inspect a request before sending it to Invoker or Repeater.',
  inputSchema: z.object({
    logId: z.string().describe('The proxy log record ID to retrieve.'),
  }),
  execute: async ({ logId }, ctx) => {
    ctx.emitAction({
      action: 'get_proxy_request',
      payload: { logId },
    });
    const requests = ctx.redactedContext.proxyRequests || [];
    const found = requests.find((r) => r.id === logId);
    if (!found) {
      return { error: `Proxy log "${logId}" not found in context. Use listProxyHosts or getProxySummary to find available log IDs.` };
    }
    return found;
  },
};
