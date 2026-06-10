'use client';

import React from 'react';
import {
  Play,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAutomationStore, type ExecutionLog } from '@/stores/automation';

const levelIcons: Record<ExecutionLog['level'], typeof Info> = {
  info: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
};

const levelStyles: Record<ExecutionLog['level'], string> = {
  info: 'text-muted-foreground',
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

export function ExecutionLogPanel() {
  const logs = useAutomationStore((s) => s.executionLogs);
  const isRunning = useAutomationStore((s) => s.isRunning);
  const clearLogs = useAutomationStore((s) => s.clearLogs);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = React.useState(false);

  // Auto-scroll to bottom when new logs appear
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div className="flex h-full flex-col border-t bg-background">
      {/* Header */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b px-3">
        <button
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronDown
            className={cn(
              'size-3.5 transition-transform',
              collapsed && '-rotate-90'
            )}
          />
          {isRunning ? (
            <Play className="size-3 text-primary animate-pulse" />
          ) : (
            <Play className="size-3 text-muted-foreground" />
          )}
          <span>Execution Log</span>
          {logs.length > 0 && (
            <span className="ml-1 text-[10px] text-muted-foreground">
              ({logs.length})
            </span>
          )}
        </button>
        {logs.length > 0 && (
          <Button
            variant="ghost"
            size="xs"
            className="h-5 w-5 p-0"
            onClick={clearLogs}
            title="Clear logs"
          >
            <Trash2 className="size-3" />
          </Button>
        )}
      </div>

      {/* Log content */}
      {!collapsed && (
        <ScrollArea className="flex-1">
          <div ref={scrollRef} className="h-full overflow-y-auto">
            {logs.length === 0 ? (
              <div className="flex h-full items-center justify-center py-4">
                <p className="text-[11px] text-muted-foreground">
                  {isRunning ? 'Running...' : 'Run a workflow to see execution logs'}
                </p>
              </div>
            ) : (
              <div className="space-y-0.5 py-1 font-mono text-[11px]">
                {logs.map((log) => {
                  const Icon = levelIcons[log.level];
                  return (
                    <div
                      key={log.id}
                      className={cn(
                        'flex items-start gap-2 px-3 py-0.5',
                        'hover:bg-muted/50',
                        log.level === 'error' && 'bg-red-500/5'
                      )}
                    >
                      <Icon className={cn('size-3 shrink-0 mt-0.5', levelStyles[log.level])} />
                      <span className="shrink-0 text-muted-foreground/60">
                        {formatTime(log.timestamp)}
                      </span>
                      <span className={levelStyles[log.level]}>
                        {log.message}
                      </span>
                      {log.nodeLabel && (
                        <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0 text-[10px] text-muted-foreground">
                          {log.nodeLabel}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
