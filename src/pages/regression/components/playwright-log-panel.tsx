import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { RegressionLogEntry } from '../types';

interface PlaywrightLogPanelProps {
  logs: RegressionLogEntry[];
  isRunning: boolean;
}

const levelColors: Record<RegressionLogEntry['level'], string> = {
  info: 'bg-blue-400',
  warning: 'bg-yellow-400',
  error: 'bg-red-400',
};

const levelBg: Record<RegressionLogEntry['level'], string> = {
  info: 'bg-blue-50 dark:bg-blue-950/20',
  warning: 'bg-yellow-50 dark:bg-yellow-950/20',
  error: 'bg-red-50 dark:bg-red-950/20',
};

const logTypeColors: Record<string, string> = {
  navigation: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  regression: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  action: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  assertion: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  extraction: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString();
  } catch {
    return '';
  }
}

export function PlaywrightLogPanel({ logs, isRunning }: PlaywrightLogPanelProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to latest log
  React.useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [logs]);

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="p-1.5">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-center">
            <p className="text-xs text-muted-foreground">
              {isRunning ? 'Waiting for Playwright logs…' : 'No logs yet. Run a test to see execution details.'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    'flex items-start gap-2 px-2 py-1 rounded-sm text-xs transition-colors',
                    levelBg[log.level] || ''
                  )}
                >
                  {/* Level indicator dot */}
                  <div
                    className={cn(
                      'size-2 rounded-full shrink-0 mt-1',
                      levelColors[log.level] || 'bg-slate-400'
                    )}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Log type badge */}
                      {log.logType && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] px-1 py-0 h-4 leading-none border-0',
                            logTypeColors[log.logType] || 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {log.logType}
                        </Badge>
                      )}
                      {/* Timestamp */}
                      <span className="text-[10px] text-muted-foreground/60">
                        {formatTime(log.createdAt)}
                      </span>
                    </div>
                    {/* Message */}
                    <p
                      className={cn(
                        'mt-0.5 leading-relaxed break-words',
                        log.level === 'error' && 'text-red-600 dark:text-red-400',
                        log.level === 'warning' && 'text-yellow-600 dark:text-yellow-400'
                      )}
                    >
                      {log.message}
                    </p>
                    {/* URL if present */}
                    {log.url && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground/50 truncate font-mono">
                        {log.url}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {/* Invisible element for auto-scroll */}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </ScrollArea>
  );
}
