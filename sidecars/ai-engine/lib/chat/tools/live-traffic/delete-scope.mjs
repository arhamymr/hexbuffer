import { tool } from 'ai';
import { z } from 'zod';

export function createDeleteScopeTool(emitAction) {
  return tool({
    description:
      'Delete a single target from the reconnaissance scope by its display name. Always ask for human confirmation before calling this.',
    inputSchema: z.object({
      targetId: z
        .string()
        .describe('The display name of the target to delete, e.g. "kai-testing".'),
    }),
    execute: async ({ targetId }) => {
      emitAction({
        action: 'delete_target',
        payload: { targetId },
      });

      return {
        success: true,
        message: `Target "${targetId}" removed from scope.`,
      };
    },
  });
}
