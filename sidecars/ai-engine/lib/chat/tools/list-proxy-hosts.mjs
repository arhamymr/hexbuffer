import { tool } from 'ai';
import { z } from 'zod';

export function createListProxyHostsTool(redactedContext, emitAction) {
  return tool({
    description: 'List all unique hosts from captured proxy traffic. Returns host names, path counts, and methods. Use this to discover what targets are communicating through the proxy.',
    inputSchema: z.object({}),
    execute: async () => {
      emitAction({
        action: 'list_proxy_hosts',
        payload: {},
      });
      const tree = redactedContext.proxyTree || [];
      return tree.map((node) => ({
        host: node.host,
        pathCount: node.paths?.length ?? 0,
        methods: [...new Set(node.paths?.flatMap((p) => p.methods || []))],
      }));
    },
  });
}
