import { z } from 'zod';

export const sendToInvokerDef = {
  description: 'Send a proxy HTTP request to the Invoker tool. The app will configure the attack with the request, auto-detect payload positions from $ markers, and open the Invoker page. Use this when you want to brute-force, fuzz, or test parameters on an endpoint.',
  inputSchema: z.object({
    logId: z.string().describe('The proxy log ID of the request to send to Invoker.'),
    rawRequest: z.string().optional().describe('A raw HTTP request string with $-marked payload positions. Provide this to explicitly mark what to fuzz. If omitted, the original request is used.'),
    payloadValues: z.array(z.string()).optional().describe('Payload values to inject at marked positions. Provide common fuzzing values if the user has not specified any.'),
    delayMs: z.number().optional().describe('Delay between attack requests in milliseconds. Defaults to 100.'),
  }),
  execute: async ({ logId, rawRequest, payloadValues, delayMs }, ctx) => {
    ctx.emitAction({
      action: 'send_to_invoker',
      payload: {
        logId,
        rawRequest: rawRequest || null,
        payloadValues: payloadValues || null,
        delayMs: delayMs ?? 100,
      },
    });
    return { success: true, logId, message: 'Request sent to Invoker. The app will open the Invoker page with the attack configured.' };
  },
};
