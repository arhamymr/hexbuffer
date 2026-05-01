'use client';

import { FindingStatus, STATUS_COLORS } from './types';

interface StatusBadgeProps {
  status: FindingStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status];

  const statusLabels: Record<FindingStatus, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    verified: 'Verified',
    fixed: 'Fixed',
    false_positive: 'False Positive',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text} ${className}`}
    >
      {statusLabels[status]}
    </span>
  );
}