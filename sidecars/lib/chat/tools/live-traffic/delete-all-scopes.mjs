import { z } from 'zod';

export const deleteAllScopesDef = {
  description:
    'Delete ALL targets from the reconnaissance scope. This is destructive and irreversible. Always ask for human confirmation before calling this.',
  inputSchema: z.object({}),
  execute: async (_input, ctx) => {
    ctx.emitAction({
      action: 'delete_all_targets',
      payload: {},
    });

    return {
      success: true,
      message: 'All targets cleared from scope.',
    };
  },
};
