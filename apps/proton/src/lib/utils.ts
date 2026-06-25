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
