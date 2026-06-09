import { z } from 'zod';

export const listCrawlSessionsDef = {
  description: 'List recent AI browser crawl sessions available in context.',
  inputSchema: z.object({}),
  execute: async (_input, ctx) => {
    ctx.emitAction({
      action: 'list_crawl_sessions',
      payload: {},
    });
    return ctx.redactedContext.crawlSessions || [];
  },
};
