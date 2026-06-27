import type { ApiCall } from '@/types';
import { buildHttpCurlCommand } from '@/lib/http-message';

export const METHOD_FILTERS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] as const;

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

export function formatTimestamp(timestamp: string | number) {
  const ms = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  const date = new Date(ms);
  if (isNaN(date.getTime())) return ms;
  const time = date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return time;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "-";
  return `${ms}ms`;
}

export function getExtension(url: string): string {
  if (!url) return "-";
  try {
    const pathname = new URL(url).pathname;
    const lastDot = pathname.lastIndexOf('.');
    if (lastDot > -1 && lastDot < pathname.length - 1) {
      return pathname.substring(lastDot);
    }
  } catch {}
  return "-";
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

export function buildCurlCommand(call: ApiCall): string {
  if (!call) return '';
  return buildHttpCurlCommand({
    method: call.method,
    url: call.url,
    headers: call.headers,
    body: call.request_body ?? '',
  });
}
