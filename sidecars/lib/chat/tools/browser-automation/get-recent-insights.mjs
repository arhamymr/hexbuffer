import { z } from 'zod';

export const getRecentInsightsDef = {
  description: 'Read recent reconnaissance insights.',
  inputSchema: z.object({}),
  execute: async (_input, ctx) => {
    ctx.emitAction({
      action: 'get_recent_insights',
      payload: {},
    });
    return ctx.redactedContext.latestCrawl?.insights || [];
  },
};
