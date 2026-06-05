const DANGEROUS_PATTERNS = [
  '/logout',
  '/signout',
  '/delete',
  '/remove',
  '/destroy',
  '/payment',
  '/billing',
  '/checkout',
];

export function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString().replace(/\/$/, '/');
  } catch {
    return null;
  }
}

export function shouldBlockUrl(url, config, visited, depth) {
  const parsed = new URL(url);
  const target = new URL(config.targetUrl);
  const pathname = parsed.pathname.toLowerCase();
  const excludes = String(config.excludePaths || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (visited.has(url)) return 'duplicate';
  if (depth > config.maxDepth) return 'max-depth';
  if (config.sameDomainOnly && parsed.hostname !== target.hostname) return 'outside-scope';
  if (DANGEROUS_PATTERNS.some((pattern) => pathname.includes(pattern))) return 'dangerous-url';
  if (excludes.some((pattern) => pathname.includes(pattern.replace(/\*/g, '')))) return 'excluded-path';

  return null;
}
