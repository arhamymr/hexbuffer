import { z } from 'zod';

/**
 * Explain a security finding — describe the vulnerability, its impact,
 * and potential attack scenarios.
 */
export const explainFindingDef = {
  description: 'Explain a security finding: describe the vulnerability, its impact, and attack scenarios.',
  inputSchema: z.object({
    findingId: z.string().describe('The ID of the finding to explain (e.g. SEC-0001, DEP-0003)'),
  }),
  execute: async (input, ctx) => {
    if (ctx?.emitAction) {
      ctx.emitAction({
        action: 'explain_finding',
        payload: { findingId: input.findingId },
      });
    }
    return {
      status: 'explained',
      findingId: input.findingId,
      message: `Explaining finding ${input.findingId}.`,
    };
  },
};
