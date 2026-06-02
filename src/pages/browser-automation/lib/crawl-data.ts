import type {
  ActivityLog,
  AIInsight,
  CrawlOverview,
  CrawlPage,
  CrawlSession,
  CrawlStatus,
  CrawlTreeNode,
} from '../types';

export function buildCrawlTree(pages: CrawlPage[]): CrawlTreeNode[] {
  const nodes = new Map<string, CrawlTreeNode>();
  const roots: CrawlTreeNode[] = [];

  pages.forEach((page) => {
    nodes.set(page.url, { ...page, children: [] });
  });

  pages.forEach((page) => {
    const node = nodes.get(page.url);
    if (!node) return;

    const parent = page.parentUrl ? nodes.get(page.parentUrl) : null;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (items: CrawlTreeNode[]) => {
    items.sort((a, b) => a.url.localeCompare(b.url));
    items.forEach((item) => sortNodes(item.children));
  };

  sortNodes(roots);
  return roots;
}

export function deriveOverview(session: CrawlSession | null, pages: CrawlPage[]): CrawlOverview {
  const status: CrawlStatus = session?.status ?? 'idle';
  const now = Date.now();
  const started = session?.startedAt ? new Date(session.startedAt).getTime() : now;
  const finished = session?.finishedAt ? new Date(session.finishedAt).getTime() : now;
  const durationSeconds = session?.startedAt ? Math.max(0, Math.floor((finished - started) / 1000)) : 0;

  return {
    sessionStatus: status,
    pagesVisited: pages.filter((page) => page.status === 'visited').length,
    urlsDiscovered: pages.length,
    urlsQueued: pages.filter((page) => page.status === 'queued').length,
    currentDepth: pages.reduce((max, page) => Math.max(max, page.depth), 0),
    errors: pages.filter((page) => page.status === 'error').length,
    blockedPages: pages.filter((page) => page.status === 'blocked').length,
    formsFound: pages.reduce((total, page) => total + page.formsFound, 0),
    screenshotsCaptured: pages.filter((page) => Boolean(page.screenshotPath)).length,
    durationSeconds,
  };
}

export function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

export function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function createMockCrawl(seedSession: CrawlSession): {
  pages: CrawlPage[];
  insights: AIInsight[];
  logs: ActivityLog[];
} {
  const now = Date.now();
  const ts = (offsetSeconds: number) => new Date(now + offsetSeconds * 1000).toISOString();
  const sessionId = seedSession.id;

  const pages: CrawlPage[] = [
    {
      id: 'page-root',
      sessionId,
      url: '/',
      title: 'Home',
      status: 'visited',
      depth: 0,
      httpStatus: 200,
      linksFound: 18,
      formsFound: 0,
      screenshotPath: '/screenshots/home.png',
      discoveredAt: ts(-70),
      visitedAt: ts(-68),
      aiSummary: 'Landing page exposes primary navigation, pricing, login, and product entry points.',
    },
    {
      id: 'page-about',
      sessionId,
      url: '/about',
      title: 'About',
      status: 'visited',
      depth: 1,
      parentUrl: '/',
      httpStatus: 200,
      linksFound: 6,
      formsFound: 0,
      screenshotPath: '/screenshots/about.png',
      discoveredAt: ts(-64),
      visitedAt: ts(-58),
      aiSummary: 'Informational page with team and careers links.',
    },
    {
      id: 'page-products',
      sessionId,
      url: '/products',
      title: 'Products',
      status: 'current',
      depth: 1,
      parentUrl: '/',
      httpStatus: 200,
      linksFound: 11,
      formsFound: 0,
      screenshotPath: '/screenshots/products.png',
      discoveredAt: ts(-63),
      visitedAt: ts(-5),
      aiSummary: 'Product hub links into web, mobile, and API surfaces.',
    },
    {
      id: 'page-web',
      sessionId,
      url: '/products/web',
      title: 'Web Product',
      status: 'queued',
      depth: 2,
      parentUrl: '/products',
      linksFound: 0,
      formsFound: 0,
      discoveredAt: ts(-3),
    },
    {
      id: 'page-api',
      sessionId,
      url: '/products/api',
      title: 'API Product',
      status: 'queued',
      depth: 2,
      parentUrl: '/products',
      linksFound: 0,
      formsFound: 0,
      discoveredAt: ts(-2),
    },
    {
      id: 'page-login',
      sessionId,
      url: '/login',
      title: 'Sign in',
      status: 'visited',
      depth: 1,
      parentUrl: '/',
      httpStatus: 200,
      linksFound: 4,
      formsFound: 1,
      screenshotPath: '/screenshots/login.png',
      discoveredAt: ts(-62),
      visitedAt: ts(-48),
      aiSummary: 'Authentication entry point with username, password, remember-me, and password reset controls.',
    },
    {
      id: 'page-admin',
      sessionId,
      url: '/admin',
      title: 'Admin',
      status: 'blocked',
      depth: 1,
      parentUrl: '/',
      httpStatus: 403,
      linksFound: 0,
      formsFound: 0,
      discoveredAt: ts(-44),
      visitedAt: ts(-42),
      aiSummary: 'Route responds with forbidden status and should be reviewed for authorization behavior.',
    },
    {
      id: 'page-avatar',
      sessionId,
      url: '/profile/avatar',
      title: 'Avatar Upload',
      status: 'visited',
      depth: 2,
      parentUrl: '/login',
      httpStatus: 200,
      linksFound: 3,
      formsFound: 1,
      screenshotPath: '/screenshots/avatar.png',
      discoveredAt: ts(-32),
      visitedAt: ts(-30),
      aiSummary: 'Upload form discovered behind account profile route.',
      interesting: true,
    },
    {
      id: 'page-error',
      sessionId,
      url: '/legacy/report',
      title: 'Server Error',
      status: 'error',
      depth: 2,
      parentUrl: '/',
      httpStatus: 500,
      linksFound: 0,
      formsFound: 0,
      discoveredAt: ts(-28),
      visitedAt: ts(-27),
      aiSummary: 'Legacy report route returned a server error during crawl.',
    },
  ];

  const insights: AIInsight[] = [
    {
      id: 'insight-admin',
      sessionId,
      pageId: 'page-admin',
      severity: 'medium',
      type: 'admin-route',
      title: 'Admin route discovered',
      description: 'The crawler found /admin from the primary navigation graph and received HTTP 403.',
      url: '/admin',
      reviewed: false,
      createdAt: ts(-41),
    },
    {
      id: 'insight-upload',
      sessionId,
      pageId: 'page-avatar',
      severity: 'medium',
      type: 'upload-form',
      title: 'Upload form detected',
      description: 'A profile avatar form accepts file input and should be reviewed for validation and content handling.',
      url: '/profile/avatar',
      reviewed: false,
      createdAt: ts(-29),
    },
    {
      id: 'insight-login',
      sessionId,
      pageId: 'page-login',
      severity: 'info',
      type: 'login-form',
      title: 'Login page detected',
      description: 'The sign-in page contains credential fields and password reset navigation.',
      url: '/login',
      reviewed: true,
      createdAt: ts(-47),
    },
    {
      id: 'insight-js',
      sessionId,
      pageId: 'page-products',
      severity: 'low',
      type: 'javascript-route',
      title: 'Client-side route references',
      description: 'Product scripts reference API and dashboard routes that are not directly linked in markup.',
      url: '/products',
      reviewed: false,
      createdAt: ts(-8),
    },
  ];

  const logs: ActivityLog[] = [
    { id: 'log-start', sessionId, level: 'info', type: 'session', message: 'Started crawl', createdAt: ts(-70) },
    { id: 'log-root', sessionId, level: 'info', type: 'navigation', message: 'Opened /', url: '/', createdAt: ts(-68) },
    { id: 'log-links', sessionId, level: 'info', type: 'extraction', message: 'Extracted 18 links from /', url: '/', createdAt: ts(-67) },
    { id: 'log-about', sessionId, level: 'info', type: 'queue', message: 'Queued /about', url: '/about', createdAt: ts(-64) },
    { id: 'log-login', sessionId, level: 'info', type: 'ai', message: 'Login form detected', url: '/login', createdAt: ts(-47) },
    { id: 'log-admin', sessionId, level: 'warning', type: 'policy', message: 'Blocked page observed at /admin', url: '/admin', createdAt: ts(-42) },
    { id: 'log-shot', sessionId, level: 'info', type: 'screenshot', message: 'Screenshot captured for /profile/avatar', url: '/profile/avatar', createdAt: ts(-29) },
    { id: 'log-error', sessionId, level: 'error', type: 'error', message: 'HTTP 500 returned by /legacy/report', url: '/legacy/report', createdAt: ts(-27) },
  ];

  return { pages, insights, logs };
}
