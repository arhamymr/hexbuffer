import { tool } from 'ai';
import { z } from 'zod';

export function createListCrawlSessionsTool(redactedContext) {
  return tool({
    description: 'List recent AI browser crawl sessions available in context.',
    inputSchema: z.object({}),
    execute: async () => redactedContext.crawlSessions || [],
  });
}
