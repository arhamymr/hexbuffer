'use client';

import { Copy, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { InspectorNetworkEntry } from '../types';

interface NetworkDetailProps {
  entry: InspectorNetworkEntry | null;
}

export function NetworkDetail({ entry }: NetworkDetailProps) {
  if (!entry) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Activity className="mx-auto size-8 opacity-30" />
          <p className="mt-2 text-xs">Select a request to view details</p>
        </div>
      </div>
    );
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success('Copied'),
      () => toast.error('Failed to copy')
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b bg-muted px-3 py-2">
        <span className={`text-xs font-mono font-semibold ${
          entry.method === 'GET' ? 'text-green-500' :
          entry.method === 'POST' ? 'text-blue-500' :
          'text-foreground'
        }`}>
          {entry.method}
        </span>
        <span className="text-xs text-muted-foreground truncate flex-1">
          {entry.url}
        </span>
        <Button
          variant="outline"
          size="xs"
          className="h-6"
          onClick={() => handleCopy(entry.url)}
        >
          <Copy className="size-3" />
        </Button>
      </header>

      <div className="flex-1 overflow-auto p-3 space-y-4">
        <div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            General
          </div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span>{entry.resourceType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">MIME</span>
              <span className="truncate max-w-[200px]">{entry.mimeType || '\u2014'}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Request URL
          </div>
          <pre className="text-xs font-mono whitespace-pre-wrap break-words rounded bg-muted/50 p-3 text-foreground leading-relaxed max-h-[200px] overflow-auto">
            {entry.url}
          </pre>
        </div>
      </div>
    </div>
  );
}
