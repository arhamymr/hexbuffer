import { z } from 'zod';

export const sendToRepeaterDef = {
  description: 'Send a proxy HTTP request to the Repeater tool for manual editing and re-sending. The app will open the Repeater page with the request loaded.',
  inputSchema: z.object({
    logId: z.string().describe('The proxy log ID of the request to send to Repeater.'),
  }),
  execute: async ({ logId }, ctx) => {
    ctx.emitAction({
      action: 'send_to_repeater',
      payload: { logId },
    });
    return { success: true, logId, message: 'Request sent to Repeater.' };
  },
};
