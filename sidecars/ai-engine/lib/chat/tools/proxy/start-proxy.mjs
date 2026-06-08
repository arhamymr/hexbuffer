import { tool } from 'ai';
import { z } from 'zod';

export function createStartProxyTool(emitAction) {
  return tool({
    description: 'Start the local interception proxy so browser traffic can be captured. Use this when the proxy is not running and the user wants to scan or analyze a target. The proxy must be active before triggerScan can work.',
    inputSchema: z.object({
      port: z.number().optional().describe('HTTP proxy port. Defaults to 8888.'),
      tlsPort: z.number().optional().describe('HTTPS MITM proxy port. Defaults to 8889.'),
    }),
    execute: async ({ port, tlsPort }) => {
      emitAction({
        action: 'start_proxy',
        payload: {
          port: port ?? 8888,
          tlsPort: tlsPort ?? 8889,
        },
      });
      return {
        success: true,
        message: `Proxy start requested on port ${port ?? 8888} (HTTP) / ${tlsPort ?? 8889} (HTTPS MITM).`,
      };
    },
  });
}
