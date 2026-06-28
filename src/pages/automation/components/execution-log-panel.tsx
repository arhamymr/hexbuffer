import React from 'react';
import {
  PlayIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  WarningCircleIcon,
  Info,
  TrashIcon,
  CaretDownIcon,
  CaretRightIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  useAutomationStore,
  type ExecutionLog,
} from '@/stores/automation';

const levelIcons: Record<ExecutionLog['level'], typeof Info> = {
  info: Info,
  success: CheckCircleIcon,
  error: WarningCircleIcon,
  warning: WarningCircleIcon,
};

const levelStyles: Record<ExecutionLog['level'], string> = {
  info: 'text-muted-foreground',
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
};

const EMPTY_EXECUTION_LOGS: ExecutionLog[] = [];

interface ExecutionLogPanelProps {
  workflowId: string | null;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

function JsonLogData({ data }: { data: unknown }) {
  const json = React.useMemo(() => JSON.stringify(data, null, 2), [data]);
  return <>{json}</>;
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

export function ExecutionLogPanel({ workflowId }: ExecutionLogPanelProps) {
  const logs = useAutomationStore((s) =>
    workflowId ? s.executionLogsByWorkflowId[workflowId] ?? EMPTY_EXECUTION_LOGS : EMPTY_EXECUTION_LOGS
  );
  const workflowRuntime = useAutomationStore((s) =>
    workflowId ? s.workflowRuntimeById[workflowId] ?? null : null
  );
  const clearLogs = useAutomationStore((s) => s.clearLogs);
  const pruneExecutionLogs = useAutomationStore((s) => s.pruneExecutionLogs);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = React.useState(false);
  const [expandedLogIds, setExpandedLogIds] = React.useState<Set<string>>(new Set());
  const visibleLogs = React.useMemo(() => dedupeById(logs).reverse(), [logs]);
  const isWorkflowRunning = Boolean(workflowRuntime?.processing);
  const toggleExpand = (logId: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const hasData = (log: ExecutionLog) => log.inputData != null || log.outputData != null;

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
          <CaretDownIcon
            className={cn(
              'size-3.5 transition-transform',
              collapsed && '-rotate-90'
            )}
          />
          {isWorkflowRunning ? (
            <PlayIcon className="size-3 text-primary animate-pulse" />
          ) : (
            <PlayIcon className="size-3 text-muted-foreground" />
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
              <TrashIcon className="size-3" />
            </Button>
          )}
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
                const isExpanded = expandedLogIds.has(log.id);
                const canExpand = hasData(log);
                return (
                  <React.Fragment key={log.id}>
                    <div
                      className={cn(
                        'flex items-start gap-2 px-3 py-0.5 group',
                        'hover:bg-muted/50',
                        log.level === 'error' && 'bg-red-500/5'
                      )}
                    >
                      {canExpand ? (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="shrink-0 mt-0.5 hover:text-foreground text-muted-foreground"
                          aria-label={isExpanded ? 'Collapse data' : 'Expand data'}
                        >
                          {isExpanded ? (
                            <CaretDownIcon className="size-3" />
                          ) : (
                            <CaretRightIcon className="size-3" />
                          )}
                        </button>
                      ) : (
                        <Icon className={cn('size-3 shrink-0 mt-0.5', levelStyles[log.level])} />
                      )}
                      <span className="shrink-0 text-muted-foreground/60">
                        {formatTime(log.timestamp)}
                      </span>
                      <span className={canExpand ? levelStyles[log.level] : levelStyles[log.level]}>
                        {log.message}
                      </span>
                      {log.nodeLabel && (
                        <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0 text-[10px] text-muted-foreground">
                          {log.nodeLabel}
                        </span>
                      )}
                    </div>
                    {/* Expanded data view */}
                    {isExpanded && canExpand && (
                      <div className="mx-3 mb-1 rounded border bg-muted/30 px-3 py-2 font-mono text-[10px]">
                        {log.inputData != null && (
                          <div className="mb-1.5">
                            <span className="font-semibold text-muted-foreground uppercase tracking-wider">Input:</span>
                            <pre className="mt-0.5 whitespace-pre-wrap break-all text-muted-foreground">
                              <JsonLogData data={log.inputData} />
                            </pre>
                          </div>
                        )}
                        {log.outputData != null && (
                          <div>
                            <span className="font-semibold text-muted-foreground uppercase tracking-wider">Output:</span>
                            <pre className="mt-0.5 whitespace-pre-wrap break-all text-muted-foreground">
                              <JsonLogData data={log.outputData} />
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
