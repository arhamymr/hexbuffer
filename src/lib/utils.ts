import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function matchesScope(host: string, scope: string[]): boolean {
  if (scope.length === 0) return true;

  const normalizedHost = host.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');

  for (const pattern of scope) {
    const normalizedPattern = pattern.trim().toLowerCase().replace(/\.$/, '');

    if (normalizedPattern.startsWith('*.')) {
      const domain = normalizedPattern.slice(2);
      if (normalizedHost === domain || normalizedHost.endsWith('.' + domain)) {
        return true;
      }
    } else if (normalizedHost === normalizedPattern) {
      return true;
    }
  }
  return false;
}

export function cleanUrl(url: string): string {
  if (!url) return url;
  let cleaned = url;
  if (cleaned.startsWith('https://')) {
    cleaned = cleaned.replace(/(https:\/\/[^/:]+):443(\/|$)/, '$1$2');
  } else if (cleaned.startsWith('http://')) {
    cleaned = cleaned.replace(/(http:\/\/[^/:]+):80(\/|$)/, '$1$2');
  }
  return cleaned;
}
