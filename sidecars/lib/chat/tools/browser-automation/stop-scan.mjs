import { z } from 'zod';

export const stopScanDef = {
  description:
    'Stop the currently running browser crawl entirely. This cannot be resumed. Use this when the user wants to permanently stop a scan.',
  inputSchema: z.object({}),
  execute: async (_input, ctx) => {
    ctx.emitAction({
      action: 'stop_scan',
      payload: {},
    });

    return { success: true, message: 'Crawl stopped.' };
  },
  experimental_toToolResultContent: (result) => [
    { type: 'text', text: result.message },
  ],
};
