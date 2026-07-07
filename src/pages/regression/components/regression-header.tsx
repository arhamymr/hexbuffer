import { FlaskIcon, ListChecksIcon, PlayIcon, PlayCircleIcon, SquareIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TestCase } from '../types';

export function RegressionHeader({
  activeTestName,
  activeTabTestCase,
  activeTestCases,
  testCases,
  activeTestEnabledCount,
  enabledCount,
  activeTabRunCount,
  totalRuns,
  isRunning,
  activeTab,
  onRunAll,
  onRun,
  onAbort,
  queue,
  onStopQueue,
}: {
  activeTestName: string;
  activeTabTestCase: TestCase | null;
  activeTestCases: TestCase[];
  testCases: TestCase[];
  activeTestEnabledCount: number;
  enabledCount: number;
  activeTabRunCount: number;
  totalRuns: number;
  isRunning: boolean;
  activeTab: { isEditing?: boolean } | null;
  onRunAll: () => void;
  onRun: () => void;
  onAbort: () => void;
  queue: string[];
  onStopQueue: () => void;
}) {
  const isQueueActive = queue.length > 0;

  return (
    <header className="shrink-0 border-b bg-muted px-4 py-3 select-none">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-sm border bg-background text-primary shadow-sm hover:scale-[1.03] transition-transform">
            <FlaskIcon className="size-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight">{activeTestName}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {activeTabTestCase?.name || 'Create, run, and review browser regression checks'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isQueueActive && (
            <Badge variant="default" className="h-7 gap-1.5 rounded-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold text-xs px-2 animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-100 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              Batch: {queue.length} left
            </Badge>
          )}
          <Badge variant="outline" className="h-7 gap-1.5 rounded-sm bg-background text-xs text-muted-foreground/80 font-medium">
            <ListChecksIcon className="size-3.5" />
            {activeTestCases.length || testCases.length} case{(activeTestCases.length || testCases.length) !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="h-7 rounded-sm bg-background text-xs text-muted-foreground/80 font-medium">
            {activeTestEnabledCount || enabledCount} enabled
          </Badge>
          <Badge variant="outline" className="h-7 rounded-sm bg-background text-xs text-muted-foreground/80 font-medium">
            {activeTabRunCount || totalRuns} run{(activeTabRunCount || totalRuns) !== 1 ? 's' : ''}
          </Badge>
          {isQueueActive ? (
            <Button
              variant="destructive"
              onClick={onStopQueue}
              className="gap-1.5 active:scale-[0.97] transition-transform"
            >
              <SquareIcon className="size-3.5 fill-current" />
              Stop Queue
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={onRunAll}
              disabled={isRunning || activeTestEnabledCount === 0}
              className="active:scale-[0.97] transition-transform gap-1"
            >
              <PlayCircleIcon className="size-4" />
              Run All
            </Button>
          )}
          {isRunning ? (
            <Button
              variant="destructive"
              onClick={onAbort}
              className="active:scale-[0.97] transition-transform gap-1.5"
            >
              <SquareIcon className="size-4 fill-current" />
              Stop
            </Button>
          ) : (
            <Button
              onClick={onRun}
              disabled={!activeTabTestCase || activeTab?.isEditing}
              className="active:scale-[0.97] transition-transform gap-1.5"
            >
              <PlayIcon className="size-4 fill-current" />
              Run
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
