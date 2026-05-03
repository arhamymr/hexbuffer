import type { ProxyLogEntry } from '@/stores/trafficStore';

export const METHOD_FILTERS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'] as const;

export const STATUS_FILTERS = [
  { label: '2xx', min: 200, max: 299 },
  { label: '3xx', min: 300, max: 399 },
  { label: '4xx', min: 400, max: 499 },
  { label: '5xx', min: 500, max: 599 },
] as const;

export const COOKIE_COLORS = [
  { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
  { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30' },
  { bg: 'bg-pink-500/10', text: 'text-pink-500', border: 'border-pink-500/30' },
  { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30' },
  { bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/30' },
  { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30' },
] as const;

export function getStatusColor(status: number | null | undefined) {
  if (!status) return 'bg-gray-500';
  if (status >= 200 && status < 300) return 'bg-green-600';
  if (status >= 300 && status < 400) return 'bg-blue-600';
  if (status >= 400 && status < 500) return 'bg-orange-600';
  if (status >= 500) return 'bg-red-600';
  return 'bg-gray-600';
}

export function formatTimestamp(timestamp: string | number) {
  const ms = typeof timestamp === 'string' ? timestamp : String(timestamp);
  if (ms.includes('.')) return ms;
  const date = new Date(Number(ms));
  const time = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return time;
}

export function getMethodBadge(method: string) {
  const colors: Record<string, string> = {
    GET: 'bg-green-600',
    POST: 'bg-blue-600',
    PUT: 'bg-orange-600',
    DELETE: 'bg-red-600',
    PATCH: 'bg-purple-600',
    HEAD: 'bg-gray-600',
    OPTIONS: 'bg-teal-600',
    CONNECT: 'bg-indigo-600',
    TRACE: 'bg-cyan-600',
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-bold text-white ${colors[method.toUpperCase()] || 'bg-gray-600'}`}>
      {method.toUpperCase()}
    </span>
  );
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function parseCookieHeader(cookieString: string | null | undefined): { name: string; value: string }[] {
  if (!cookieString) return [];
  return cookieString.split(';').map((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return { name: pair.trim(), value: '' };
    return {
      name: pair.substring(0, idx).trim(),
      value: pair.substring(idx + 1).trim(),
    };
  });
}

export function buildCurlCommand(proxyData: ProxyLogEntry): string {
  if (!proxyData) return '';
  const lines: string[] = [`curl -X ${proxyData.method || 'GET'}`];
  if (proxyData.request_headers) {
    for (const [k, v] of proxyData.request_headers) {
      lines.push(`  -H '${k}: ${v}'`);
    }
  }
  if (proxyData.request_body) {
    const escaped = proxyData.request_body.replace(/'/g, "'\\''");
    lines.push(`  -d '${escaped}'`);
  }
  const protocol = proxyData.port === 443 ? 'https' : 'http';
  const port = proxyData.port === 443 || proxyData.port === 80 ? '' : `:${proxyData.port}`;
  lines.push(`  '${protocol}://${proxyData.host}${port}${proxyData.url || '/'}'`);
  return lines.join(' \\\n');
}
