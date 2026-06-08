import { tool } from 'ai';
import { z } from 'zod';

export function createDeleteAllScopesTool(emitAction) {
  return tool({
    description:
      'Delete ALL targets from the reconnaissance scope. This is destructive and irreversible. Always ask for human confirmation before calling this.',
    inputSchema: z.object({}),
    execute: async () => {
      emitAction({
        action: 'delete_all_targets',
        payload: {},
      });

      return {
        success: true,
        message: 'All targets cleared from scope.',
      };
    },
  });
}
