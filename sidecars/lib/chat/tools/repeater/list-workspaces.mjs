import { z } from 'zod';

export const listWorkspacesDef = {
  description: 'List all existing workspaces in the Repeater tool. Returns their names and unique IDs.',
  inputSchema: z.object({}),
  execute: async (_input, ctx) => {
    ctx.emitAction({
      action: 'list_workspaces',
      payload: {},
    });
    return ctx.redactedContext.workspaces || [];
  },
};
