import { tool } from 'ai';
import { z } from 'zod';

const STATUS_ICONS = {
  current: '🟢',
  queued: '⏳',
  visited: '✅',
  error: '❌',
  blocked: '🚫',
};

export function createGetBrowserTabsTool(redactedContext, emitAction) {
  return tool({
    description:
      'List pages (browser tabs) discovered during a browser automation crawl session. Each page represents a URL the crawler has encountered or visited. Use the status filter to find active tabs ("current"), queued tabs waiting to be crawled ("queued"), or already visited pages ("visited"). Use this to monitor crawl progress and see what pages are open in the browser.',
    inputSchema: z.object({
      sessionId: z
        .string()
        .optional()
        .describe('The crawl session ID. Defaults to the latest crawl if omitted.'),
      status: z
        .enum(['current', 'queued', 'visited', 'error', 'blocked'])
        .optional()
        .describe(
          'Filter by page status. "current" returns the page the crawler is actively on. "queued" returns pages waiting in the crawl queue. "visited" returns pages already processed. Omit to see all pages.',
        ),
    }),
    execute: async ({ sessionId, status }) => {
      emitAction({
        action: 'get_browser_tabs',
        payload: { sessionId, status },
      });

      const crawlSessions = redactedContext.crawlSessions || [];
      const targetId = sessionId || redactedContext.latestCrawl?.session?.id;

      if (!targetId) {
        return {
          session: null,
          pages: [],
          summary: {
            total: 0,
            current: 0,
            queued: 0,
            visited: 0,
            error: 0,
            blocked: 0,
          },
          message: 'No browser automation sessions found. Start a crawl with triggerScan first.',
        };
      }

      let pages = [];
      let session = null;

      if (redactedContext.latestCrawl?.session?.id === targetId) {
        pages = redactedContext.latestCrawl.pages || [];
        session = redactedContext.latestCrawl.session;
      }

      if (!session) {
        session = crawlSessions.find((s) => s.id === targetId) || null;
      }
      if (!session) {
        return {
          session: null,
          pages: [],
          summary: { total: 0, current: 0, queued: 0, visited: 0, error: 0, blocked: 0 },
          message: `Crawl session "${targetId}" not found in available context.`,
        };
      }

      const filtered = status ? pages.filter((p) => p.status === status) : pages;

      const counts = {
        total: pages.length,
        current: pages.filter((p) => p.status === 'current').length,
        queued: pages.filter((p) => p.status === 'queued').length,
        visited: pages.filter((p) => p.status === 'visited').length,
        error: pages.filter((p) => p.status === 'error').length,
        blocked: pages.filter((p) => p.status === 'blocked').length,
      };

      const tabs = filtered.map((page) => ({
        id: page.id,
        url: page.url,
        title: page.title || 'Untitled',
        status: page.status,
        depth: page.depth,
        parentUrl: page.parentUrl || null,
        linksFound: page.linksFound,
        formsFound: page.formsFound,
        httpStatus: page.httpStatus || null,
        discoveredAt: page.discoveredAt,
        icon: STATUS_ICONS[page.status] || '❓',
      }));

      return {
        session: {
          id: session.id,
          targetUrl: session.targetUrl,
          status: session.status,
        },
        pages: tabs,
        summary: counts,
        message: status
          ? `${counts[status]} page(s) with status "${status}" in session "${session.id}".`
          : `${counts.total} page(s) total in session "${session.id}" (${counts.current} active, ${counts.queued} queued, ${counts.visited} visited).`,
      };
    },
    experimental_toToolResultContent: (result) => {
      const parts = [{ type: 'text', text: result.message }];

      if (result.pages.length > 0) {
        const pageList = result.pages
          .map((p) => `${p.icon} ${p.url} — ${p.title} (depth ${p.depth})`)
          .join('\n');
        parts.push({ type: 'text', text: pageList });
      }

      return parts;
    },
  });
}
