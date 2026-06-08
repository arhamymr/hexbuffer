import { tool } from 'ai';
import { z } from 'zod';

export function createGetCrawlContextTool(redactedContext, emitAction) {
  return tool({
    description: 'Read crawl pages, insights, and logs from the latest crawl context.',
    inputSchema: z.object({
      sessionId: z.string().optional(),
    }),
    execute: async ({ sessionId }) => {
      emitAction({
        action: 'get_crawl_context',
        payload: { sessionId },
      });
      const targetId = sessionId || redactedContext.latestCrawl?.session?.id;
      if (!targetId || redactedContext.latestCrawl?.session?.id !== targetId) {
        return { session: null, pages: [], insights: [], logs: [] };
      }
      return redactedContext.latestCrawl;
    },
  });
}
