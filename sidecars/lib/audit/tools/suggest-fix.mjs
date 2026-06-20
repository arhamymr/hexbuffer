import { z } from 'zod';

/**
 * Suggest a practical fix for a security finding with secure code examples.
 */
export const suggestFixDef = {
  description: 'Suggest a practical fix for a security finding with secure code examples.',
  inputSchema: z.object({
    findingId: z.string().describe('The ID of the finding to fix'),
  }),
  execute: async (input, ctx) => {
    if (ctx?.emitAction) {
      ctx.emitAction({
        action: 'suggest_fix',
        payload: { findingId: input.findingId },
      });
    }
    return {
      status: 'fix_suggested',
      findingId: input.findingId,
      message: `Suggesting fix for finding ${input.findingId}.`,
    };
  },
};
