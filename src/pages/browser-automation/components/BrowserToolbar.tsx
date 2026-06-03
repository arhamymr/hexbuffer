'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, Play, Square, ExternalLink } from 'lucide-react';
import type { BrowserStatus } from '@/stores/browser-automation';

interface BrowserToolbarProps {
  url: string;
  isRunning: boolean;
  browserStatus: BrowserStatus | null;
  onUrlChange: (url: string) => void;
  onOpenBrowser: () => void;
  onCloseBrowser: () => void;
  onRefreshSnapshot: () => void;
  onRunAi: () => void;
  onStop: () => void;
  onAddTab: () => void;
}

export function BrowserToolbar({
  url,
  isRunning,
  browserStatus,
  onUrlChange,
  onOpenBrowser,
  onCloseBrowser,
  onRefreshSnapshot,
  onRunAi,
  onStop,
  onAddTab,
}: BrowserToolbarProps) {
  const isBrowserRunning = browserStatus?.running ?? false;

  return (
    <div className="bg-muted h-12 px-3 py-2 border-b flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 flex-1">
        <Input
          className="h-8 text-sm"
          placeholder="Enter URL to crawl (e.g., https://example.com)"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && url && !isRunning) {
              onOpenBrowser();
            }
          }}
        />
        {isBrowserRunning && browserStatus?.url && (
          <Badge variant="secondary" className="text-xs">
            {browserStatus.url.length > 40
              ? browserStatus.url.substring(0, 40) + '...'
              : browserStatus.url}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="xs" onClick={onAddTab}>
          <Plus className="h-4 w-4 mr-1" />
          NEW
        </Button>

        {!isBrowserRunning ? (
          <Button variant="outline" size="xs" onClick={onOpenBrowser} disabled={!url}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Open Browser
          </Button>
        ) : (
          <Button variant="outline" size="xs" onClick={onCloseBrowser}>
            Close
          </Button>
        )}

        {isBrowserRunning && (
          <Button variant="outline" size="xs" onClick={onRefreshSnapshot}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Snapshot
          </Button>
        )}

        {isRunning ? (
          <Button variant="destructive" size="xs" onClick={onStop}>
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
        ) : (
          <Button
            size="xs"
            onClick={onRunAi}
            disabled={!url || !isBrowserRunning}
          >
            <Play className="h-4 w-4 mr-1" />
            Run AI
          </Button>
        )}
      </div>
    </div>
  );
}