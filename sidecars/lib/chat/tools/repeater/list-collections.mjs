import { z } from 'zod';

export const listCollectionsDef = {
  description: 'List all existing API collections and folders in the Repeater tool. Returns their names, IDs, parentIds, and workspaces they belong to.',
  inputSchema: z.object({}),
  execute: async (_input, ctx) => {
    ctx.emitAction({
      action: 'list_collections',
      payload: {},
    });
    return ctx.redactedContext.stashes || [];
  },
};
