'use client';

import { Severity, SEVERITY_COLORS } from './types';

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

export function SeverityBadge({ severity, className = '' }: SeverityBadgeProps) {
  const colors = SEVERITY_COLORS[severity];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colors.bg} ${colors.text} ${className}`}
    >
      {severity}
    </span>
  );
}