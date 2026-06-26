import type { DiffMode } from './types';

export const DIFF_MODE_OPTIONS: { value: DiffMode; label: string }[] = [
  { value: 'lines', label: 'Lines' },
  { value: 'words', label: 'Words' },
  { value: 'chars', label: 'Chars' },
];

export const MODE_LABELS: Record<DiffMode, string> = {
  lines: 'Lines',
  words: 'Words',
  chars: 'Chars',
};
