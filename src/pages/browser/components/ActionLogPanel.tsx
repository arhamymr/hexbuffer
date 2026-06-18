'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ActivityStatusBadge, statusActivity } from '@/components/status-badge';
import type { ActionLogEntry } from '@/stores/browser-automation';
import type { StatusActivityValue } from '@/components/status-badge';

interface ActionLogPanelProps {
  actions: ActionLogEntry[];
  onClear: () => void;
}

function mapTypeToActivity(type: ActionLogEntry['type']): StatusActivityValue {
  switch (type) {
    case 'command': return statusActivity.session;
    case 'result':  return statusActivity.extraction;
    case 'error':   return statusActivity.error;
    case 'ai':      return statusActivity.ai;
    default:        return statusActivity.queue;
  }
}

export function ActionLogPanel({ actions, onClear }: ActionLogPanelProps) {
  const topRef = useRef<HTMLDivElement>(null);
  const reversed = [...actions].reverse();

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [actions]);

  return (
    <div className="flex-1 flex flex-col min-h-0 border-b">
      <div className="px-2 py-1 border-b flex items-center justify-between">
        <span className="text-xs font-medium">Action Log</span>
        <Button variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1 space-y-0">
          <div ref={topRef} />
          {actions.length === 0 ? (
            <div className="text-xs text-muted-foreground p-1">No actions yet.</div>
          ) : (
            reversed.map((action, index) => (
              <div
                key={index}
                className="flex items-start gap-1.5 py-1 px-2 border-b border-border text-xs"
              >
                <ActivityStatusBadge status={mapTypeToActivity(action.type)} />
                <span className="text-muted-foreground text-[10px]">
                  {action.timestamp.toLocaleTimeString()}
                </span>
                <span className="flex-1 break-words">{action.message}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}