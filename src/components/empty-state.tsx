import { BugIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';

interface EmptyStateProps {
  variant: 'no-traffic' | 'no-matches';
}

export function EmptyState({ variant }: EmptyStateProps) {
  if (variant === 'no-traffic') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <BugIcon className="h-12 w-12 mb-4 opacity-20" />
        <p className="text-lg font-medium mb-2">No traffic captured</p>
        <p className="text-sm">Make HTTP requests to see logs here</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <MagnifyingGlassIcon className="h-12 w-12 mb-4 opacity-20" />
      <p className="text-lg font-medium mb-2">No matching logs</p>
      <p className="text-sm">Try adjusting your filters</p>
    </div>
  );
}
