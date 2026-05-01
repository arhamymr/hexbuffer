import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function matchesScope(host: string, scope: string[]): boolean {
  if (scope.length === 0) return true;

  for (const pattern of scope) {
    if (pattern.startsWith('*.')) {
      const domain = pattern.slice(2);
      if (host === domain || host.endsWith('.' + domain)) {
        return true;
      }
    } else if (host === pattern) {
      return true;
    }
  }
  return false;
}