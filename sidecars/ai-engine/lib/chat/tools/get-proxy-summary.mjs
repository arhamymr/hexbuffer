import { tool } from 'ai';
import { z } from 'zod';

export function createGetProxySummaryTool(redactedContext, emitAction) {
  return tool({
    description: 'Read recent HTTP proxy summary context.',
    inputSchema: z.object({}),
    execute: async () => {
      emitAction({
        action: 'get_proxy_summary',
        payload: {},
      });
      return redactedContext.proxySummary || [];
    },
  });
}
