'use client';

import { CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TestResult } from './types';

export function StatusBadge({ result }: { result: TestResult }) {
  if (!result.success) {
    return (
      <Badge variant="destructive" className="justify-center gap-1">
        Error
      </Badge>
    );
  }

  if (result.isAnomaly) {
    return (
      <Badge variant="destructive" className="justify-center gap-1">
        {result.status}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="justify-center gap-1">
      <CheckCircle className="h-3 w-3" />
      {result.status}
    </Badge>
  );
}
