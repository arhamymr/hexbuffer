import { tool } from 'ai';
import { z } from 'zod';

export function createGetProxySummaryTool(redactedContext) {
  return tool({
    description: 'Read recent HTTP proxy summary context.',
    inputSchema: z.object({}),
    execute: async () => redactedContext.proxySummary || [],
  });
}
