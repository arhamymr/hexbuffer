'use client';

interface BruteForceProgressProps {
  progress: { current: number; total: number } | null;
}

export function BruteForceProgress({ progress }: BruteForceProgressProps) {
  if (!progress) {
    return null;
  }

  const percentage = Math.round((progress.current / progress.total) * 100);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-sm mb-1">
        <span>Progress</span>
        <span>
          {progress.current} / {progress.total} ({percentage}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${(progress.current / progress.total) * 100}%` }}
        />
      </div>
    </div>
  );
}
