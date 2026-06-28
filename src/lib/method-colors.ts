export const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-500 dark:text-green-400',
  POST: 'text-amber-500 dark:text-amber-400',
  PUT: 'text-orange-500 dark:text-orange-400',
  DELETE: 'text-red-500 dark:text-red-400',
  PATCH: 'text-purple-500 dark:text-purple-400',
  OPTIONS: 'text-cyan-500 dark:text-cyan-400',
  HEAD: 'text-gray-500 dark:text-gray-400',
};

export const METHOD_BADGE_COLORS: Record<string, string> = {
  GET: 'bg-green-500 dark:bg-green-500 border-green-500 text-background',
  POST: 'bg-amber-500 dark:bg-amber-500 border-amber-500 text-background',
  PUT: 'bg-orange-500 dark:bg-orange-500 border-orange-500 text-background',
  DELETE: 'bg-red-500 dark:bg-red-500 border-red-500 text-background',
  PATCH: 'bg-purple-500 dark:bg-purple-500 border-purple-500 text-background',
  OPTIONS: 'bg-cyan-500 dark:bg-cyan-500 border-cyan-500 text-background',
  HEAD: 'bg-gray-500 dark:bg-gray-500 border-gray-500 text-background',
};

export function getMethodColor(method: string): string {
  const upper = method.toUpperCase();
  return METHOD_COLORS[upper] || 'text-gray-500 dark:text-gray-400';
}

export function getMethodBadgeColor(method: string): string {
  const upper = method.toUpperCase();
  return METHOD_BADGE_COLORS[upper] || 'bg-gray-500 dark:bg-gray-500 border-gray-500 text-background';
}
