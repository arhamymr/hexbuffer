import type { ConsoleFilterLevel } from './types';

export const DEFAULT_DEBUGGING_PORT = 9222;

export const CONSOLE_FILTERS: { value: ConsoleFilterLevel; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'log', label: 'Log' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warn' },
  { value: 'error', label: 'Error' },
  { value: 'pageerror', label: 'Page Error' },
];

export const CONSOLE_LEVEL_COLORS: Record<string, string> = {
  log: 'text-blue-600 dark:text-blue-400',
  info: 'text-sky-600 dark:text-sky-400',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
  debug: 'text-violet-600 dark:text-violet-400',
  pageerror: 'text-rose-600 dark:text-rose-400',
};
