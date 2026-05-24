'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Square } from 'lucide-react';

interface BruteForceToolbarProps {
  isRunning: boolean;
  progress: { current: number; total: number } | null;
  canStart: boolean;
  startBlockedReason?: string | null;
  onStart: () => void;
  onStop: () => void;
}

export function BruteForceToolbar({
  isRunning,
  progress,
  canStart,
  startBlockedReason,
  onStart,
  onStop,
}: BruteForceToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {isRunning && progress && (
          <Badge variant="secondary" className="animate-pulse">
            {progress.current} / {progress.total}
          </Badge>
        )}
        {!isRunning && startBlockedReason && (
          <Badge variant={canStart ? 'secondary' : 'outline'}>
            {startBlockedReason}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isRunning ? (
          <Button variant="destructive" size="xs" onClick={onStop}>
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
        ) : (
          <Button size="xs" onClick={onStart} disabled={!canStart}>
            <Play className="h-4 w-4 mr-1" />
            Start Attack
          </Button>
        )}
      </div>
    </div>
  );
}
