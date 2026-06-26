import type { SqliTechnique } from './types';

export const TECHNIQUE_LABELS: Record<SqliTechnique, string> = {
  boolean_blind: 'Boolean Blind',
  time_based: 'Time-Based',
  union: 'UNION-Based',
  error_based: 'Error-Based',
};

export const SEVERITY_COLORS = {
  critical: 'border-red-500/20 text-red-500 bg-red-500/5',
  high: 'border-orange-500/20 text-orange-500 bg-orange-500/5',
  medium: 'border-yellow-500/20 text-yellow-500 bg-yellow-500/5',
  low: 'border-blue-500/20 text-blue-500 bg-blue-500/5',
} as const;
