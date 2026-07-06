import { z } from 'zod';

export const createWorkspaceDef = {
  description: 'Create a new Repeater workspace to organize API collections and requests under a single tab.',
  inputSchema: z.object({
    name: z.string().optional().describe('Optional name for the workspace. Defaults to "Workspace X".'),
    id: z.string().optional().describe('Optional unique identifier to set for the workspace, allowing you to link collections/endpoints to it in the same turn.'),
  }),
  execute: async ({ name, id }, ctx) => {
    ctx.emitAction({
      action: 'create_workspace',
      payload: { name, id },
    });
    return { success: true, message: `Workspace "${name || 'Default'}" creation triggered with ID "${id || 'auto'}".` };
  },
};
