import { z } from 'zod';

export const getProxySummaryDef = {
  description: 'Read recent HTTP proxy summary context.',
  inputSchema: z.object({}),
  execute: async (_input, ctx) => {
    ctx.emitAction({
      action: 'get_proxy_summary',
      payload: {},
    });
    return ctx.redactedContext?.proxySummary || [];
  },
};
