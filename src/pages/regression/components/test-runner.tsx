import React from 'react';
import { PlayIcon, CheckCircleIcon, XCircleIcon, SpinnerGapIcon, ClockIcon, WarningCircleIcon, PlayCircleIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StepResult, TestCase, TestRun } from '../types';
import { STEP_KIND_LABELS, STEP_KIND_ICONS } from '../constants';

interface TestRunnerProps {
  testCase: TestCase | null;
  activeRun: { testCaseId: string; runId: string; status: string } | null;
  liveSteps: StepResult[];
  latestRun: TestRun | null;
  onRun: (testCaseId: string) => void;
  onRunStep: (stepIndex: number) => void;
  isRunning: boolean;
  runningStepIndex: number | null;
  singleStepResults: Record<number, StepResult>;
}

export function TestRunner({
  testCase,
  activeRun,
  liveSteps,
  latestRun,
  onRun,
  onRunStep,
  isRunning,
  runningStepIndex,
  singleStepResults,
}: TestRunnerProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to latest step
  React.useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [liveSteps]);

  if (!testCase) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <PlayIcon className="size-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">Select a test case to run</p>
      </div>
    );
  }

  const isRunningForThis = activeRun?.testCaseId === testCase.id && (activeRun.status === 'running' || activeRun.status === 'queued');
  const displaySteps = isRunningForThis && liveSteps.length > 0
    ? liveSteps
    : latestRun?.stepResults || [];

  // Map the test case steps with results
  const stepStatuses = testCase.steps.map((step, i) => {
    // CheckIcon for single-step results first
    const singleResult = singleStepResults[i];
    if (singleResult) {
      return { ...step, status: singleResult.status, error: singleResult.error || null, durationMs: singleResult.durationMs || 0 };
    }

    const result = displaySteps.find((r) => r.stepIndex === i);
    if (isRunningForThis && !result) {
      return { ...step, status: 'pending' as const, error: null, durationMs: 0 };
    }
    return { ...step, status: result?.status || 'pending', error: result?.error || null, durationMs: result?.durationMs || 0 };
  });

  const isRunningActive = isRunningForThis && isRunning;
  const canRunSingleStep = !isRunning;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold truncate">{testCase.name}</h2>
          <p className="text-xs text-muted-foreground truncate">
            {testCase.targetUrl || 'No target URL'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 select-none">
          <Button
            size="sm"
            onClick={() => onRun(testCase.id)}
            disabled={isRunning}
            className="gap-1.5 shrink-0 active:scale-[0.97]"
          >
            {isRunningForThis ? (
              <>
                <SpinnerGapIcon className="size-3.5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <PlayIcon className="size-3.5" />
                Run Test
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Step progress */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1.5">
          {stepStatuses.map((step, i) => {
            const Icon = STEP_KIND_ICONS[step.kind];
            const isRunning = step.status === 'running';
            const isPassed = step.status === 'passed';
            const isFailed = step.status === 'failed';
            const isPending = step.status === 'pending' || step.status === 'skipped';
            const isSingleRunning = runningStepIndex === i;

            return (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-3 px-3 py-2.5 rounded-sm border border-border/40 bg-card/25 transition-all duration-150 relative overflow-hidden group select-none',
                  isRunning && 'border-blue-500/30 bg-blue-50/10 dark:bg-blue-950/10',
                  isPassed && 'border-emerald-500/20 bg-emerald-50/5 dark:bg-emerald-950/5',
                  isFailed && 'border-rose-500/30 bg-rose-50/10 dark:bg-rose-950/10',
                  isPending && 'text-muted-foreground hover:bg-card/45'
                )}
              >
                {/* Left accent border */}
                {isRunning && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}
                {isPassed && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                {isFailed && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />}

                {/* Status icon badge */}
                <div className="shrink-0 mt-0.5">
                  {isRunning || isSingleRunning ? (
                    <div className="flex size-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950/50">
                      <SpinnerGapIcon className="size-3.5 text-blue-500 animate-spin" />
                    </div>
                  ) : isPassed ? (
                    <div className="flex size-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                      <CheckCircleIcon className="size-3.5 text-emerald-500" />
                    </div>
                  ) : isFailed ? (
                    <div className="flex size-5 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/50">
                      <XCircleIcon className="size-3.5 text-rose-500" />
                    </div>
                  ) : (
                    <div className="flex size-5 items-center justify-center rounded-full border border-dashed border-muted-foreground/30">
                      <ClockIcon className="size-3.5 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Step info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 leading-none">
                    {Icon && <Icon className="size-3.5 text-muted-foreground/75" />}
                    <span className="text-xs font-semibold">{STEP_KIND_LABELS[step.kind]}</span>
                    <span className="text-[10px] text-muted-foreground/50 font-mono">
                      #{i + 1}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 font-mono mt-1 truncate">
                    {step.kind === 'navigate' && step.value}
                    {step.kind === 'click' && step.selector}
                    {step.kind === 'fill' && `${step.selector} ← "${step.value}"`}
                    {step.kind === 'wait' && `${step.ms || 1000}ms`}
                    {step.kind === 'screenshot' && (step.name || 'Screenshot')}
                    {step.kind === 'assert-visible' && step.selector}
                    {step.kind === 'assert-text' && `"${step.value}"`}
                    {step.kind === 'assert-url' && step.pattern}
                    {step.kind === 'ai-verify' && (step.prompt || 'AI analysis')}
                  </p>

                  {/* Error message */}
                  {isFailed && step.error && (
                    <div className="mt-2 flex items-start gap-1 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 p-2 rounded-sm border border-rose-500/10">
                      <WarningCircleIcon className="size-3.5 shrink-0 mt-0.5" />
                      <span className="font-mono break-all whitespace-pre-wrap">{step.error}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 select-none align-middle self-center">
                  {/* Run Step button (single step execution) */}
                  {canRunSingleStep && isPending && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity active:scale-[0.97]"
                      onClick={() => onRunStep(i)}
                      title={`Run step ${i + 1}`}
                    >
                      <PlayCircleIcon className="size-4 text-muted-foreground hover:text-blue-500" />
                    </Button>
                  )}

                  {/* Duration */}
                  {!isPending && step.durationMs > 0 && (
                    <Badge variant="outline" className="text-[10px] font-mono font-medium rounded-sm py-0.5 bg-background">
                      {(step.durationMs / 1000).toFixed(2)}s
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
          {/* Invisible element for auto-scroll */}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Summary footer */}
      {!isRunningForThis && latestRun && (
        <div className="px-4 py-3 border-t bg-card shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant={latestRun.status === 'passed' ? 'default' : 'destructive'}
                className={cn(
                  latestRun.status === 'passed' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                )}
              >
                {latestRun.status === 'passed' ? 'Passed' : 'Failed'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {latestRun.stepResults.filter((r) => r.status === 'passed').length}/
                {latestRun.stepResults.length} steps passed
              </span>
            </div>
            {latestRun.finishedAt && (
              <span className="text-[11px] text-muted-foreground">
                {new Date(latestRun.finishedAt).toLocaleString()}
              </span>
            )}
          </div>
          {latestRun.aiVerdict && (
            <div className="mt-2 rounded-md bg-muted/50 p-2.5">
              <p className="text-xs font-medium mb-1">AI Verdict</p>
              <p className="text-xs text-muted-foreground">
                {latestRun.aiVerdict.reasoning}
              </p>
              {latestRun.aiVerdict.suggestions.length > 0 && (
                <ul className="mt-1.5 space-y-0.5">
                  {latestRun.aiVerdict.suggestions.map((s, i) => (
                    <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                      <span className="text-blue-400 mt-0.5">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
