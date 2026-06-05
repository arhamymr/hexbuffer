import type {
  CrawlOverview,
  CrawlPage,
  CrawlSession,
  CrawlStatus,
  CrawlTreeNode,
} from '../types';

export function buildCrawlTree(pages: CrawlPage[]): CrawlTreeNode[] {
  const nodes = new Map<string, CrawlTreeNode>();
  const roots: CrawlTreeNode[] = [];
  const parentByUrl = new Map<string, string>();
  const attachedNodeIds = new Set<string>();

  pages.forEach((page) => {
    nodes.set(page.url, { ...page, children: [] });
    if (page.parentUrl) {
      parentByUrl.set(page.url, page.parentUrl);
    }
  });

  const createsCycle = (url: string, parentUrl: string) => {
    const seen = new Set<string>([url]);
    let current: string | undefined = parentUrl;

    while (current) {
      if (seen.has(current)) return true;
      seen.add(current);
      current = parentByUrl.get(current);
    }

    return false;
  };

  pages.forEach((page) => {
    const node = nodes.get(page.url);
    if (!node || attachedNodeIds.has(node.id)) return;

    const parentUrl = page.parentUrl;
    const parent = parentUrl ? nodes.get(parentUrl) : null;
    if (parentUrl && parent && parent !== node && !createsCycle(page.url, parentUrl)) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
    attachedNodeIds.add(node.id);
  });

  const sortNodes = (items: CrawlTreeNode[], visited = new Set<string>()) => {
    items.sort((a, b) => a.url.localeCompare(b.url));
    items.forEach((item) => {
      if (visited.has(item.id)) {
        item.children = [];
        return;
      }
      visited.add(item.id);
      sortNodes(item.children, new Set(visited));
    });
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
