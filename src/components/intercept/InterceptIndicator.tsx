'use client';

import { useInterceptContext } from './InterceptProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, List } from 'lucide-react';

export function InterceptIndicator() {
  const {
    interceptEnabled,
    pendingCount,
    pendingIntercepts,
    setActiveIntercept,
    toggleIntercept,
  } = useInterceptContext();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={interceptEnabled ? 'default' : 'outline'}
        size="sm"
        onClick={toggleIntercept}
        className="gap-2"
      >
        {interceptEnabled ? <Pause className="size-4" /> : <Play className="size-4" />}
        {interceptEnabled ? 'Intercept ON' : 'Intercept OFF'}
      </Button>

      {pendingCount > 0 && (
        <Badge
          variant="secondary"
          className="gap-1 cursor-pointer"
          onClick={() => setActiveIntercept(pendingIntercepts[0])}
        >
          <List className="size-3" />
          {pendingCount} pending
        </Badge>
      )}
    </div>
  );
}