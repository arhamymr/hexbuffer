'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Play, Square, Upload } from 'lucide-react';

interface BruteForceToolbarProps {
  isRunning: boolean;
  progress: { current: number; total: number } | null;
  canStart: boolean;
  onOpenConfig: () => void;
  onOpenImport: () => void;
  onStart: () => void;
  onStop: () => void;
}

export function BruteForceToolbar({
  isRunning,
  progress,
  canStart,
  onOpenConfig,
  onOpenImport,
  onStart,
  onStop,
}: BruteForceToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {isRunning && progress && (
          <Badge variant="secondary" className="animate-pulse">
            {progress.current} / {progress.total}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="xs" onClick={onOpenConfig}>
          <Settings className="h-4 w-4 mr-1" />
          Configure
        </Button>
        <Button variant="outline" size="xs" onClick={onOpenImport}>
          <Upload className="h-4 w-4 mr-1" />
          Import Request
        </Button>
        <div className="h-6 w-px bg-border" />
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
