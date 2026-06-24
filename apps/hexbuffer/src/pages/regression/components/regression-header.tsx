import { FlaskConical, ListChecks, Play, Plus, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  onCreate,
  onRunAll,
  onRun,
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
  onCreate: () => void;
  onRunAll: () => void;
  onRun: () => void;
}) {
  return (
    <header className="shrink-0 border-b bg-muted px-3 py-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-sm border bg-background text-muted-foreground">
            <FlaskConical className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{activeTestName}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {activeTabTestCase?.name || 'Create, run, and review browser regression checks'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="h-7 gap-1.5 rounded-sm bg-background text-xs">
            <ListChecks className="size-3.5" />
            {activeTestCases.length || testCases.length} case{(activeTestCases.length || testCases.length) !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="h-7 rounded-sm bg-background text-xs">
            {activeTestEnabledCount || enabledCount} enabled
          </Badge>
          <Badge variant="outline" className="h-7 rounded-sm bg-background text-xs">
            {activeTabRunCount || totalRuns} run{(activeTabRunCount || totalRuns) !== 1 ? 's' : ''}
          </Badge>
          <Button variant="outline" onClick={onCreate}>
            <Plus className="size-4" />
            New
          </Button>
          <Button variant="outline" onClick={onRunAll} disabled={isRunning || activeTestEnabledCount === 0}>
            <PlayCircle className="size-4" />
            Run All
          </Button>
          <Button onClick={onRun} disabled={isRunning || !activeTabTestCase || activeTab?.isEditing}>
            <Play className="size-4" />
            Run
          </Button>
        </div>
      </div>
    </header>
  );
}
