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

  const isActiveForThis = activeRun?.testCaseId === testCase.id;
  const displaySteps = isActiveForThis && liveSteps.length > 0
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
    if (isActiveForThis && !result) {
      return { ...step, status: 'pending' as const, error: null, durationMs: 0 };
    }
    return { ...step, status: result?.status || 'pending', error: result?.error || null, durationMs: result?.durationMs || 0 };
  });

  const isRunningForThis = isActiveForThis && isRunning;
  const canRunSingleStep = !isRunning;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold truncate">{testCase.name}</h2>
          <p className="text-xs text-muted-foreground truncate">
            {testCase.targetUrl || 'No target URL'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            onClick={() => onRun(testCase.id)}
            disabled={isRunning}
            className="gap-1.5 shrink-0"
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
        <div className="p-3 space-y-1">
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
                  'flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors group',
                  isRunning && 'bg-blue-50 dark:bg-blue-950/30',
                  isPassed && 'bg-green-50/50 dark:bg-green-950/20',
                  isFailed && 'bg-red-50 dark:bg-red-950/30',
                  isPending && 'text-muted-foreground'
                )}
              >
                {/* Status icon */}
                <div className="shrink-0">
                  {isRunning || isSingleRunning ? (
                    <SpinnerGapIcon className="size-4 text-blue-500 animate-spin" />
                  ) : isPassed ? (
                    <CheckCircleIcon className="size-4 text-green-500" />
                  ) : isFailed ? (
                    <XCircleIcon className="size-4 text-red-500" />
                  ) : (
                    <ClockIcon className="size-4 text-muted-foreground/40" />
                  )}
                </div>

                {/* Step info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {Icon && <Icon className="size-3 text-muted-foreground" />}
                    <span className="text-xs font-medium">{STEP_KIND_LABELS[step.kind]}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
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
                    <div className="mt-1 flex items-start gap-1 text-[11px] text-red-600 dark:text-red-400">
                      <WarningCircleIcon className="size-3 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{step.error}</span>
                    </div>
                  )}
                </div>

                {/* Run Step button (single step execution) */}
                {canRunSingleStep && isPending && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRunStep(i)}
                    title={`Run step ${i + 1}`}
                  >
                    <PlayCircleIcon className="size-3.5 text-muted-foreground hover:text-blue-500" />
                  </Button>
                )}

                {/* Duration */}
                {!isPending && step.durationMs > 0 && (
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {(step.durationMs / 1000).toFixed(1)}s
                  </span>
                )}
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
