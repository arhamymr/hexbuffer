import { tool } from 'ai';
import { z } from 'zod';

export function createGetRecentInsightsTool(redactedContext, emitAction) {
  return tool({
    description: 'Read recent reconnaissance insights.',
    inputSchema: z.object({}),
    execute: async () => {
      emitAction({
        action: 'get_recent_insights',
        payload: {},
      });
      return redactedContext.latestCrawl?.insights || [];
    },
  });
}
