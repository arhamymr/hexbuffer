import { z } from 'zod';

const hostEntrySchema = z.object({
  host: z.string().describe('The hostname or URL to add, e.g. "example.com" or "https://example.com".'),
  name: z.string().optional().describe('A friendly display name for this target.'),
});

export const addScopeDef = {
  description:
    'Add one or more hosts/URLs to the reconnaissance scope so the app tracks them as targets. Use the hosts array to add multiple at once — ideal after analyzeTargetUrl discovers several hosts. For a single host you can use the shorthand host/name fields.',
  inputSchema: z
    .object({
      targetId: z
        .string()
        .optional()
        .describe(
          'Add hosts to an EXISTING target by its DISPLAY NAME. Use this to extend a target you already created. Omit to create new targets for each host.',
        ),
      host: z
        .string()
        .optional()
        .describe(
          'Shorthand for a single hostname or URL, e.g. "example.com". Use hosts instead to add multiple at once.',
        ),
      name: z.string().optional().describe('Friendly display name for the single host (shorthand).'),
      hosts: z
        .array(hostEntrySchema)
        .min(1)
        .optional()
        .describe(
          'Array of hosts to add at once. Each entry needs a host string and an optional name. Use this after analyzeTargetUrl discovers multiple hosts.',
        ),
    })
    .refine(
      (data) => data.host || (data.hosts && data.hosts.length > 0),
      'Provide either host (single) or hosts (multiple).',
    ),
  execute: async ({ host, name, hosts, targetId: targetName }, ctx) => {
    // Normalize: if hosts array is provided use it, otherwise wrap single host
    const entries = hosts && hosts.length > 0 ? hosts : [{ host, name }];

    ctx.emitAction({
      action: 'add_targets',
      payload: { hosts: entries, targetId: targetName || null },
    });

    const label = entries.length === 1
      ? `"${entries[0].name || entries[0].host}"`
      : `${entries.length} hosts`;
    const targetLabel = targetName ? ` to existing target "${targetName}"` : '';

    return {
      success: true,
      hosts: entries.map((e) => ({ host: e.host, name: e.name || null })),
      targetId: targetName || null,
      message: `${label} added${targetLabel} to scope.`,
    };
  },
  experimental_toToolResultContent: (result) => {
    const parts = [{ type: 'text', text: result.message }];
    if (result.hosts.length > 1) {
      parts.push({
        type: 'text',
        text: result.hosts.map((h) => `• ${h.name || h.host}`).join('\n'),
      });
    }
    return parts;
  },
};
