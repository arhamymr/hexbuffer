import { Skeleton } from '@/components/ui/skeleton';

interface HistoryLoadingStateProps {
  label?: string;
  columns?: number;
  rows?: number;
}

export function HistoryLoadingState({
  label = 'Loading traffic history...',
  columns = 7,
  rows = 6,
}: HistoryLoadingStateProps) {
  const colWidths = ['80px', '120px', '100px', '220px', '70px', '80px', '120px', '40px'];

  return (
    <div className="flex h-full flex-col p-3 space-y-3 animate-in fade-in-0 duration-300">
      <div className="flex items-center justify-between border-b pb-2">
        <span className="text-xs text-muted-foreground font-medium animate-pulse">
          {label}
        </span>
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="flex-1 space-y-2 overflow-hidden">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="flex items-center gap-3 border-b py-2 px-1 opacity-90"
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className="h-3.5"
                style={{
                  width: colWidths[colIndex % colWidths.length],
                  flexShrink: colIndex === 3 ? 1 : 0,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
