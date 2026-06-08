import { tool } from 'ai';
import { z } from 'zod';

export function createGetActiveBrowserTabTool(redactedContext, emitAction) {
  return tool({
    description:
      'Get the currently active page (tab) the browser crawler is visiting right now. Returns the URL, title, depth, and basic stats. Use this to check what page the crawler is on during a live scan, or to find the active page in a paused scan.',
    inputSchema: z.object({
      sessionId: z
        .string()
        .optional()
        .describe('The crawl session ID. Defaults to the latest crawl if omitted.'),
    }),
    execute: async ({ sessionId }) => {
      emitAction({
        action: 'get_active_browser_tab',
        payload: { sessionId },
      });

      const targetId = sessionId || redactedContext.latestCrawl?.session?.id;

      if (!targetId) {
        return {
          active: null,
          message: 'No browser automation session is active. Start a crawl with triggerScan.',
        };
      }

      const pages = redactedContext.latestCrawl?.pages || [];
      if (redactedContext.latestCrawl?.session?.id !== targetId) {
        return {
          active: null,
          message: `Crawl session "${targetId}" not found. Try getBrowserTabs to list available sessions.`,
        };
      }

      const active = pages.find((p) => p.status === 'current');

      if (!active) {
        const otherActive = pages.filter((p) => p.status === 'queued');
        return {
          active: null,
          queuedCount: otherActive.length,
          message: otherActive.length > 0
            ? `No page is currently being visited. ${otherActive.length} page(s) are queued for crawling. Use getBrowserTabs to see the full list.`
            : 'No pages are currently active or queued. The crawl may be idle, paused, or completed.',
        };
      }

      return {
        active: {
          id: active.id,
          url: active.url,
          title: active.title || 'Untitled',
          depth: active.depth,
          parentUrl: active.parentUrl || null,
          linksFound: active.linksFound,
          formsFound: active.formsFound,
          httpStatus: active.httpStatus || null,
          discoveredAt: active.discoveredAt,
        },
        message: `Crawler is currently on "${active.url}" (depth ${active.depth}). Title: "${active.title || 'Unknown'}".`,
      };
    },
    experimental_toToolResultContent: (result) => {
      if (!result.active) {
        return [{ type: 'text', text: result.message }];
      }
      return [
        { type: 'text', text: result.message },
        {
          type: 'text',
          text: [
            `URL: ${result.active.url}`,
            `Title: ${result.active.title}`,
            `Depth: ${result.active.depth}`,
            `Links found: ${result.active.linksFound}`,
            `Forms found: ${result.active.formsFound}`,
            result.active.httpStatus ? `HTTP Status: ${result.active.httpStatus}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ];
    },
  });
}
