import { tool } from 'ai';
import { z } from 'zod';

export function createPauseScanTool(emitAction) {
  return tool({
    description:
      'Pause the currently running browser crawl. The crawl can be resumed later with resumeScan. Use this when the user wants to temporarily stop a scan.',
    inputSchema: z.object({}),
    execute: async () => {
      emitAction({
        action: 'pause_scan',
        payload: {},
      });

      return { success: true, message: 'Crawl paused.' };
    },
    experimental_toToolResultContent: (result) => [
      { type: 'text', text: result.message },
    ],
  });
}
