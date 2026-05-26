'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ActionLogEntry } from '@/stores/browser-automation';

interface ActionLogPanelProps {
  actions: ActionLogEntry[];
  onClear: () => void;
}

export function ActionLogPanel({ actions, onClear }: ActionLogPanelProps) {
  const getTypeColor = (type: ActionLogEntry['type']) => {
    switch (type) {
      case 'command':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'result':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'ai':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 border-b">
      <div className="px-3 py-2 border-b flex items-center justify-between">
        <span className="text-xs font-medium">Action Log</span>
        <Button variant="ghost" size="xs" onClick={onClear}>
          Clear
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {actions.length === 0 ? (
            <div className="text-xs text-muted-foreground p-2">No actions yet.</div>
          ) : (
            actions.map((action, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 rounded text-xs"
              >
                <Badge variant="outline" className={`text-[10px] ${getTypeColor(action.type)}`}>
                  {action.type.toUpperCase()}
                </Badge>
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