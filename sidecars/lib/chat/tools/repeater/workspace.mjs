import { z } from 'zod';

export const createWorkspaceDef = {
  description: 'Create a new Repeater workspace to organize API collections and requests under a single tab.',
  inputSchema: z.object({
    name: z.string().optional().describe('Optional name for the workspace. Defaults to "Workspace X".'),
  }),
  execute: async ({ name }, ctx) => {
    ctx.emitAction({
      action: 'create_workspace',
      payload: { name },
    });
    return { success: true, message: `Workspace "${name || 'Default'}" creation triggered.` };
  },
};
