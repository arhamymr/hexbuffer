import { tool } from 'ai';
import { z } from 'zod';

export function createListCrawlSessionsTool(redactedContext, emitAction) {
  return tool({
    description: 'List recent AI browser crawl sessions available in context.',
    inputSchema: z.object({}),
    execute: async () => {
      emitAction({
        action: 'list_crawl_sessions',
        payload: {},
      });
      return redactedContext.crawlSessions || [];
    },
  });
}
