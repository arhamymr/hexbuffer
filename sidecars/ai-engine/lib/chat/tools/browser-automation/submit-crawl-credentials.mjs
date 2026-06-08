import { tool } from 'ai';
import { z } from 'zod';

export function createSubmitCrawlCredentialsTool(emitAction) {
  return tool({
    description: 'Submit credentials (username, password, etc.) to resume a paused browser crawl that hit a login form. Use this when the browser automation is waiting for human input and the user provides credentials in the chat.',
    inputSchema: z.object({
      sessionId: z.string().describe('The crawl session ID that is waiting for credentials.'),
      fields: z.record(z.string()).describe('A map of field names to values, e.g. { "username": "admin", "password": "pass123" }.'),
    }),
    execute: async ({ sessionId, fields }) => {
      emitAction({
        action: 'submit_crawl_input',
        payload: {
          sessionId,
          fields,
        },
      });
      return {
        success: true,
        sessionId,
        message: `Credentials submitted for crawl session "${sessionId}". The crawler will resume.`,
      };
    },
  });
}
