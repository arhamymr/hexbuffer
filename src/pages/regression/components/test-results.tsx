import React from 'react';
import { CheckCircle2, XCircle, Clock, ChevronRight, Sparkles, AlertTriangle, History } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TestRun, StepResult, AiVerdict } from '../types';
import { STEP_KIND_LABELS, STEP_KIND_ICONS } from '../constants';

interface TestResultsProps {
  runs: TestRun[];
  onRun: (testCaseId: string) => void;
  isRunning: boolean;
}

export function TestResults({ runs, onRun, isRunning }: TestResultsProps) {
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);

  const selectedRun = runs.find((r) => r.id === selectedRunId) || null;

  // Sort runs by newest first
  const sortedRuns = [...runs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Run History</h2>
        </div>
        {runs.length > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {runs.length} run{runs.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {sortedRuns.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center p-6">
          <History className="size-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No runs yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Run a test case to see results here
          </p>
        </div>
      ) : selectedRun ? (
        /* Run detail view */
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2 px-4 py-2 border-b">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => setSelectedRunId(null)}
            >
              ← Back to list
            </Button>
            <Badge
              variant={selectedRun.status === 'passed' ? 'default' : 'destructive'}
              className={cn(
                'text-[10px]',
                selectedRun.status === 'passed' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              )}
            >
              {selectedRun.status === 'passed' ? 'Passed' : 'Failed'}
            </Badge>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onRun(selectedRun.testCaseId)}
              disabled={isRunning}
            >
              Re-run
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">
              {/* Run metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Started</span>
                  <p>{selectedRun.startedAt ? new Date(selectedRun.startedAt).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Finished</span>
                  <p>{selectedRun.finishedAt ? new Date(selectedRun.finishedAt).toLocaleString() : '—'}</p>
                </div>
              </div>

              {/* Step results */}
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Step Results
                </h3>
                {selectedRun.stepResults.map((result, i) => (
                  <StepResultRow key={i} result={result} index={i} />
                ))}
              </div>

              {/* AI Verdict */}
              {selectedRun.aiVerdict && (
                <AiVerdictCard verdict={selectedRun.aiVerdict} />
              )}

              {/* Error */}
              {selectedRun.error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-destructive text-xs">{selectedRun.error}</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      ) : (
        /* Run list */
        <ScrollArea className="flex-1">
          {sortedRuns.map((run) => {
            const passed = run.stepResults.filter((r) => r.status === 'passed').length;
            const failed = run.stepResults.filter((r) => r.status === 'failed').length;
            const total = run.stepResults.length;

            return (
              <div
                key={run.id}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedRunId(run.id)}
              >
                {/* Status icon */}
                {run.status === 'passed' ? (
                  <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                ) : run.status === 'failed' ? (
                  <XCircle className="size-4 text-red-500 shrink-0" />
                ) : run.status === 'running' ? (
                  <Clock className="size-4 text-blue-500 shrink-0" />
                ) : (
                  <Clock className="size-4 text-muted-foreground shrink-0" />
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={run.status === 'passed' ? 'default' : 'destructive'}
                      className={cn(
                        'text-[10px] px-1.5 py-0',
                        run.status === 'passed' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      )}
                    >
                      {run.status}
                    </Badge>
                    {run.aiVerdict && (
                      <Sparkles className="size-3 text-blue-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      {passed}/{total} passed
                    </span>
                    {failed > 0 && (
                      <span className="text-[11px] text-red-500">
                        {failed} failed
                      </span>
                    )}
                  </div>
                </div>

                {/* Timestamp */}
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {run.finishedAt
                    ? formatRelativeTime(run.finishedAt)
                    : run.startedAt
                    ? formatRelativeTime(run.startedAt)
                    : ''}
                </span>

                <ChevronRight className="size-3.5 text-muted-foreground/40 shrink-0" />
              </div>
            );
          })}
        </ScrollArea>
      )}
    </div>
  );
}

function StepResultRow({ result, index }: { result: StepResult; index: number }) {
  const Icon = STEP_KIND_ICONS[result.kind];
  const isPassed = result.status === 'passed';
  const isFailed = result.status === 'failed';

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-2 py-1.5 rounded-sm transition-colors',
        isPassed && 'bg-green-50/50 dark:bg-green-950/20',
        isFailed && 'bg-red-50 dark:bg-red-950/30'
      )}
    >
      {isPassed && <CheckCircle2 className="size-3.5 text-green-500 shrink-0" />}
      {isFailed && <XCircle className="size-3.5 text-red-500 shrink-0" />}
      {!isPassed && !isFailed && <Clock className="size-3.5 text-muted-foreground/40 shrink-0" />}

      {Icon && <Icon className="size-3 text-muted-foreground shrink-0" />}
      <span className="text-xs flex-1 truncate">{STEP_KIND_LABELS[result.kind]}</span>

      {result.durationMs > 0 && (
        <span className="text-[10px] text-muted-foreground shrink-0">
          {(result.durationMs / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
}

function AiVerdictCard({ verdict }: { verdict: AiVerdict }) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="size-3.5 text-blue-400" />
        <span className="text-xs font-semibold">AI Verdict</span>
        <Badge
          variant={verdict.pass ? 'default' : 'destructive'}
          className={cn(
            'text-[10px] px-1.5 py-0',
            verdict.pass && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          )}
        >
          {verdict.pass ? 'PASS' : 'FAIL'}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {verdict.reasoning}
      </p>
      {verdict.suggestions.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">Suggestions</p>
          <ul className="space-y-0.5">
            {verdict.suggestions.map((s, i) => (
              <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                <span className="text-blue-400 mt-1 shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString();
}
