import { z } from 'zod';

/**
 * Classify the severity of a finding with CVSS-like rationale.
 */
export const classifySeverityDef = {
  description: 'Classify the severity of a finding with CVSS-like rationale.',
  inputSchema: z.object({
    findingId: z.string().describe('The ID of the finding to classify'),
  }),
  execute: async (input, ctx) => {
    if (ctx?.emitAction) {
      ctx.emitAction({
        action: 'classify_severity',
        payload: { findingId: input.findingId },
      });
    }
    return {
      status: 'classified',
      findingId: input.findingId,
      message: `Classifying severity for finding ${input.findingId}.`,
    };
  },
};
