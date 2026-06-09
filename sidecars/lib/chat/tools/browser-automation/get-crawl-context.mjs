import { z } from 'zod';

export const getCrawlContextDef = {
  description: 'Read crawl pages, insights, and logs from the latest crawl context.',
  inputSchema: z.object({
    sessionId: z.string().optional(),
  }),
  execute: async ({ sessionId }, ctx) => {
    ctx.emitAction({
      action: 'get_crawl_context',
      payload: { sessionId },
    });
    const targetId = sessionId || ctx.redactedContext?.latestCrawl?.session?.id;
    if (!targetId || ctx.redactedContext?.latestCrawl?.session?.id !== targetId) {
      return { session: null, pages: [], insights: [], logs: [] };
    }
    return ctx.redactedContext.latestCrawl;
  },
};
