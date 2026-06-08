import { tool } from 'ai';
import { z } from 'zod';

export function createNavigateToTool(emitAction) {
  return tool({
    description: 'Navigate the app to a specific page. Useful after configuring something to show the user the result. Valid paths: "/", "/invoker", "/repeater", "/browser-automation", "/live-traffic".',
    inputSchema: z.object({
      path: z.string().describe('The app route to navigate to, e.g. "/invoker".'),
    }),
    execute: async ({ path }) => {
      emitAction({ action: 'navigate_to', payload: { path } });
      return { success: true, path, message: `Navigated to ${path}.` };
    },
  });
}
