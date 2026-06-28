import { SpinnerIcon } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';

interface HistoryLoadingStateProps {
  label: string;
  columns: number;
}

export function HistoryLoadingState({ label, columns }: HistoryLoadingStateProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        className="sticky top-0 z-10 grid border-b bg-muted px-3 py-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="mx-1 h-3" />
        ))}
      </div>
      <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
        <SpinnerIcon className="size-3.5" />
        <span>{label}</span>
      </div>
      <div className="space-y-1 p-2">
        {Array.from({ length: 12 }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid items-center gap-3 rounded-sm px-1 py-1.5 animate-in fade-in-0 slide-in-from-top-1 duration-300"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, columnIndex) => (
              <Skeleton
                key={columnIndex}
                className="h-3"
                style={{
                  width: `${columnIndex === 2 ? 90 : 55 + ((rowIndex + columnIndex) % 4) * 10}%`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
