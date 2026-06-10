import type { ConsoleFilterLevel, InspectorTab } from './types';

export const DEFAULT_DEBUGGING_PORT = 9222;

export const TABS: ReadonlyArray<{ id: InspectorTab; label: string }> = [
  { id: 'console', label: 'Console' },
  { id: 'network', label: 'Network' },
  { id: 'storage', label: 'Storage' },
] as const;

export const CONSOLE_FILTERS: { value: ConsoleFilterLevel; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'log', label: 'Log' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warn' },
  { value: 'error', label: 'Error' },
  { value: 'pageerror', label: 'Page Error' },
];

export const CONSOLE_LEVEL_COLORS: Record<string, string> = {
  log: 'bg-blue-600',
  info: 'bg-sky-600',
  warning: 'bg-amber-600',
  error: 'bg-red-600',
  debug: 'bg-violet-600',
  pageerror: 'bg-rose-600',
};
