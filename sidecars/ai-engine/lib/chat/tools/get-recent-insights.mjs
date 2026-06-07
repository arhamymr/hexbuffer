import { tool } from 'ai';
import { z } from 'zod';

export function createGetRecentInsightsTool(redactedContext) {
  return tool({
    description: 'Read recent reconnaissance insights.',
    inputSchema: z.object({}),
    execute: async () => redactedContext.latestCrawl?.insights || [],
  });
}
