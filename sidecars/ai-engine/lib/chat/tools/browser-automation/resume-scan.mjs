import { tool } from 'ai';
import { z } from 'zod';

export function createResumeScanTool(emitAction) {
  return tool({
    description:
      'Resume a previously paused browser crawl. Use this when the user wants to continue a paused scan.',
    inputSchema: z.object({}),
    execute: async () => {
      emitAction({
        action: 'resume_scan',
        payload: {},
      });

      return { success: true, message: 'Crawl resumed.' };
    },
    experimental_toToolResultContent: (result) => [
      { type: 'text', text: result.message },
    ],
  });
}
