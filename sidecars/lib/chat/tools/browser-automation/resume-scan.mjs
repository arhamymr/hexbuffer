import { z } from 'zod';

export const resumeScanDef = {
  description:
    'Resume a previously paused browser crawl. Use this when the user wants to continue a paused scan.',
  inputSchema: z.object({}),
  execute: async (_input, ctx) => {
    ctx.emitAction({
      action: 'resume_scan',
      payload: {},
    });

    return { success: true, message: 'Crawl resumed.' };
  },
  experimental_toToolResultContent: (result) => [
    { type: 'text', text: result.message },
  ],
};
