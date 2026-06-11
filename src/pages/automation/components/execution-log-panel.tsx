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
  PanelBottomClose,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AUTOMATION_LOG_LIMIT,
  useAutomationStore,
  type ExecutionLog,
} from '@/stores/automation';
import { isWorkflowProcessing } from '../lib/workflow-runtime';

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

interface ExecutionLogPanelProps {
  workflowId: string | null;
  onHide: () => void;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

export function ExecutionLogPanel({ workflowId, onHide }: ExecutionLogPanelProps) {
  const allLogs = useAutomationStore((s) => s.executionLogs);
  const runningWorkflowIds = useAutomationStore((s) => s.runningWorkflowIds);
  const nodeRuntimeById = useAutomationStore((s) => s.nodeRuntimeById);
  const clearLogs = useAutomationStore((s) => s.clearLogs);
  const pruneExecutionLogs = useAutomationStore((s) => s.pruneExecutionLogs);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = React.useState(false);
  const logs = React.useMemo(
    () => {
      if (!workflowId) return [];
      const workflowLogs = allLogs.filter((log) => log.workflowId === workflowId);
      return workflowLogs.length > AUTOMATION_LOG_LIMIT
        ? workflowLogs.slice(-AUTOMATION_LOG_LIMIT)
        : workflowLogs;
    },
    [allLogs, workflowId]
  );
  const visibleLogs = React.useMemo(() => [...logs].reverse(), [logs]);
  const isWorkflowRunning = isWorkflowProcessing(workflowId, runningWorkflowIds, nodeRuntimeById);

  React.useEffect(() => {
    pruneExecutionLogs();
  }, [pruneExecutionLogs]);

  // Newest entries render first, so keep the viewport pinned to the top.
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
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
          {isWorkflowRunning ? (
            <Play className="size-3 text-primary animate-pulse" />
          ) : (
            <Play className="size-3 text-muted-foreground" />
          )}
          <span>Execution Log</span>
          <span className="ml-1 text-[10px] text-muted-foreground">
            ({logs.length})
          </span>
        </button>
        <div className="flex items-center gap-1">
          {logs.length > 0 && (
            <Button
              variant="ghost"
              size="xs"
              className="h-5 w-5 p-0"
              onClick={() => clearLogs(workflowId ?? undefined)}
              title="Clear this workflow log"
            >
              <Trash2 className="size-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="xs"
            className="h-5 w-5 p-0"
            onClick={onHide}
            title="Hide execution log"
          >
            <PanelBottomClose className="size-3" />
          </Button>
        </div>
      </div>

      {/* Log content */}
      {!collapsed && (
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <p className="text-[11px] text-muted-foreground">
                {isWorkflowRunning ? 'Running...' : 'Run this workflow to see execution logs'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 py-1 font-mono text-[11px]">
              {visibleLogs.map((log) => {
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
      )}
    </div>
  );
}
