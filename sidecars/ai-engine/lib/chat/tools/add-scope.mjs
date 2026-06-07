import { tool } from 'ai';
import { z } from 'zod';

export function createAddScopeTool(emitAction) {
  return tool({
    description: 'Add a host or URL to the reconnaissance scope so the app tracks it as a target.',
    inputSchema: z.object({
      host: z.string().describe('The hostname or URL to add to scope, e.g. "example.com" or "https://example.com".'),
      name: z.string().optional().describe('A friendly display name for the target.'),
    }),
    execute: async ({ host, name }) => {
      emitAction({
        action: 'add_target',
        payload: { host, name: name || null },
      });
      return { success: true, host, message: `Target "${name || host}" added to scope.` };
    },
  });
}
