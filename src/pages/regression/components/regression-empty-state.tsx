import { FlaskConical, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RegressionEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <FlaskConical className="mb-3 size-10 text-muted-foreground/30" />
      <p className="mb-1 text-sm font-medium">No test case open</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Create a new test case to start building regression coverage.
      </p>
      <Button variant="outline" className="mt-4" onClick={onCreate}>
        <Plus className="size-4" />
        New test case
      </Button>
    </div>
  );
}
