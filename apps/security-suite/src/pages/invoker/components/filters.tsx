import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useInvokerFilters } from '../hooks/use-filters';

export function InvokerFilters() {
  const {
    resultsCount,
    clearResults,
  } = useInvokerFilters();

  return (
    <div className="mb-2 flex flex-wrap items-center gap-3">
      <div className="flex-1" />
      <Button variant="outline" onClick={clearResults} disabled={resultsCount === 0}>
        <Trash2 className="h-4 w-4 mr-1" />
        Clear
      </Button>
    </div>
  );
}
