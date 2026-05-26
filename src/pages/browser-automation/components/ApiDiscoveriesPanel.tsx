'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { DiscoveredApi } from '@/stores/browser-automation';

interface ApiDiscoveriesPanelProps {
  apis: DiscoveredApi[];
}

export function ApiDiscoveriesPanel({ apis }: ApiDiscoveriesPanelProps) {
  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'POST':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'PUT':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'PATCH':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'DELETE':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-2 border-b flex items-center justify-between">
        <span className="text-xs font-medium">Discovered APIs</span>
        <Badge variant="secondary" className="text-xs">
          {apis.length} found
        </Badge>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {apis.length === 0 ? (
            <div className="text-xs text-muted-foreground p-2">
              No APIs discovered yet. Start crawling to capture API traffic.
            </div>
          ) : (
            apis.map((api, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 rounded bg-muted/50 text-xs"
              >
                <Badge variant="outline" className={`text-[10px] ${getMethodColor(api.method)}`}>
                  {api.method}
                </Badge>
                <span className="flex-1 truncate font-mono">{api.path}</span>
                <span className="text-muted-foreground text-[10px]">
                  {api.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}