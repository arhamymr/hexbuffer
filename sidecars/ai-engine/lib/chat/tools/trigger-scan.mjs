import { tool } from 'ai';
import { z } from 'zod';

export function createTriggerScanTool(emitAction) {
  return tool({
    description:
      'Trigger an AI browser crawl on a target URL. The scanner requires the proxy to be running — if the proxy is not active the scan will fail to start. By default the crawl runs in headless mode (invisible browser). Use the live parameter when the user asks to see the browser window. Use this when the user wants to scan, crawl, or deeply explore a website.',
    inputSchema: z.object({
      url: z.string().describe('The target URL to start crawling, e.g. "https://example.com".'),
      maxDepth: z.number().optional().describe('Maximum crawl depth. Defaults to 3.'),
      maxPages: z.number().optional().describe('Maximum number of pages to crawl. Defaults to 100.'),
      live: z.boolean().optional().describe('Run the crawl in live (visible) browser mode so the user can watch the browser in real time. Set to true when the user explicitly asks to see the browser. Defaults to false (headless / invisible).'),
    }),
    execute: async ({ url, maxDepth, maxPages, live }) => {
      const headless = !live;
      const depth = maxDepth ?? 3;
      const pages = maxPages ?? 100;
      const modeLabel = live ? 'live browser' : 'headless';

      emitAction({
        action: 'trigger_scan',
        payload: {
          url,
          maxDepth: depth,
          maxPages: pages,
          headless,
        },
      });

      const thinking = [
        `Deciding to trigger a browser crawl on ${url}.`,
        `Configuration: depth=${depth}, max pages=${pages}, mode=${modeLabel}.`,
        headless
          ? 'Running headless so the browser will be invisible.'
          : 'Running in live mode so the user can watch the browser in real time.',
        `The proxy must be active for the scan to proceed.`,
        `The crawler will follow links and analyze each page for security insights, forms, and endpoints.`,
      ].join(' ');

      return { thinking, success: true, url, message: `Scan triggered for "${url}" (${modeLabel} mode).` };
    },
    experimental_toToolResultContent: (result) => [
      { type: 'reasoning', text: result.thinking },
      { type: 'text', text: result.message },
    ],
  });
}
