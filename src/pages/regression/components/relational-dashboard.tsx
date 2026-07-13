import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  DatabaseIcon,
  ClockCounterClockwiseIcon,
  WarningCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CircleIcon,
  FunnelIcon,
  CopyIcon,
  CheckIcon,
  GitBranchIcon,
  GitCommitIcon,
  ShieldCheckIcon,
  BrowsersIcon,
  ArrowRightIcon,
  CpuIcon
} from '@phosphor-icons/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ponytail: Relational Playwright Regression types matching Tauri structs
interface Project {
  id: string;
  name: string;
  repositoryUrl?: string;
  createdAt: string;
}

interface Environment {
  id: string;
  name: string;
  description?: string;
}

interface RelationalRun {
  id: string;
  projectId: string;
  projectName: string;
  environmentId?: string;
  environmentName?: string;
  buildNumber: string;
  branchName: string;
  commitSha?: string;
  status: 'passed' | 'failed' | 'running' | 'cancelled';
  signOffStatus: 'pending' | 'approved' | 'blocked';
  signOffBy?: string;
  signOffNotes?: string;
  startedAt: string;
  endedAt?: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  flakyTests: number;
}

interface ErrorSignature {
  id: string;
  errorMessageSummary: string;
  errorHash: string;
  firstSeenAt: string;
}

interface TestRunResult {
  id: string;
  runId: string;
  testCaseId: string;
  testCaseTitle: string;
  suiteTitle: string;
  suiteFilePath: string;
  browser: string;
  device?: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  retryAttempts: number;
  isFlaky: boolean;
  errorId?: string;
  errorMessage?: string;
  traceUrl?: string;
  videoUrl?: string;
  screenshotUrl?: string;
  executedAt: string;
}

export function RelationalDashboard() {
  const [activeView, setActiveView] = React.useState<'runs' | 'errors' | 'schema'>('runs');

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [environments, setEnvironments] = React.useState<Environment[]>([]);
  const [runs, setRuns] = React.useState<RelationalRun[]>([]);
  const [errorSignatures, setErrorSignatures] = React.useState<ErrorSignature[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('all');
  const [selectedEnvId, setSelectedEnvId] = React.useState<string>('all');
  const [selectedRun, setSelectedRun] = React.useState<RelationalRun | null>(null);
  const [runResults, setRunResults] = React.useState<TestRunResult[]>([]);
  const [runResultsFilter, setRunResultsFilter] = React.useState<'all' | 'failed' | 'flaky'>('all');

  // Loading states
  const [loading, setLoading] = React.useState<boolean>(true);
  const [resultsLoading, setResultsLoading] = React.useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = React.useState<string | null>(null);
  const [hoveredTable, setHoveredTable] = React.useState<string | null>(null);

  // Load initial parameters
  const loadInitialData = React.useCallback(async () => {
    setLoading(true);
    try {
      const projs = await invoke<Project[]>('list_projects');
      const envs = await invoke<Environment[]>('list_environments');
      const errs = await invoke<ErrorSignature[]>('list_error_signatures');
      
      setProjects(projs);
      setEnvironments(envs);
      setErrorSignatures(errs);
    } catch (err) {
      console.error('Failed to load dashboard parameters:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load runs matching filters
  const loadRunsData = React.useCallback(async () => {
    try {
      const projIdParam = selectedProjectId === 'all' ? null : selectedProjectId;
      const envIdParam = selectedEnvId === 'all' ? null : selectedEnvId;
      
      const runsData = await invoke<RelationalRun[]>('list_regression_runs_relational', {
        projectId: projIdParam,
        environmentId: envIdParam,
      });
      setRuns(runsData);
    } catch (err) {
      console.error('Failed to load runs:', err);
    }
  }, [selectedProjectId, selectedEnvId]);

  // Load results for selected run
  const loadRunResults = React.useCallback(async (runId: string) => {
    setResultsLoading(true);
    try {
      const results = await invoke<TestRunResult[]>('list_test_run_results', { runId });
      setRunResults(results);
    } catch (err) {
      console.error('Failed to load run results:', err);
    } finally {
      setResultsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  React.useEffect(() => {
    loadRunsData();
  }, [loadRunsData]);

  React.useEffect(() => {
    if (selectedRun) {
      loadRunResults(selectedRun.id);
    }
  }, [selectedRun, loadRunResults]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const filteredRunResults = React.useMemo(() => {
    return runResults.filter((res) => {
      if (runResultsFilter === 'failed') return res.status === 'failed';
      if (runResultsFilter === 'flaky') return res.isFlaky;
      return true;
    });
  }, [runResults, runResultsFilter]);

  const recommendedIndexes = [
    {
      name: 'idx_runs_project_date',
      table: 'regression_runs',
      columns: 'project_id, started_at DESC',
      sql: 'CREATE INDEX idx_runs_project_date ON regression_runs (project_id, started_at DESC);',
      description: 'Speeds up dashboard loads by optimizing project run listing queries.'
    },
    {
      name: 'idx_results_flaky',
      table: 'test_run_results',
      columns: 'is_flaky',
      sql: 'CREATE INDEX idx_results_flaky ON test_run_results (is_flaky) WHERE is_flaky = TRUE;',
      description: 'Optimizes flaky test history and aggregate health metric calculations.'
    },
    {
      name: 'idx_results_run_id',
      table: 'test_run_results',
      columns: 'run_id',
      sql: 'CREATE INDEX idx_results_run_id ON test_run_results (run_id);',
      description: 'Drastically accelerates individual run detail retrievals.'
    },
    {
      name: 'idx_results_test_case_history',
      table: 'test_run_results',
      columns: 'test_case_id, executed_at DESC',
      sql: 'CREATE INDEX idx_results_test_case_history ON test_run_results (test_case_id, executed_at DESC);',
      description: 'Powers sub-second test execution trend graphing.'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-background min-h-0 text-foreground">
      {/* Sub-Header / Toggle Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0 bg-muted/20 select-none">
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setActiveView('runs'); setSelectedRun(null); }}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-sm transition-all active:scale-[0.97] flex items-center gap-1.5",
              activeView === 'runs' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ClockCounterClockwiseIcon className="size-4" />
            Runs Log
          </button>
          <button
            onClick={() => setActiveView('errors')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-sm transition-all active:scale-[0.97] flex items-center gap-1.5",
              activeView === 'errors' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <WarningCircleIcon className="size-4" />
            Error Signatures
          </button>
          <button
            onClick={() => setActiveView('schema')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-sm transition-all active:scale-[0.97] flex items-center gap-1.5",
              activeView === 'schema' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <DatabaseIcon className="size-4" />
            Schema Explorer
          </button>
        </div>

        {activeView === 'runs' && !selectedRun && (
          <div className="flex items-center gap-2">
            {/* Project Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Project:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-card text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Environment Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Env:</span>
              <select
                value={selectedEnvId}
                onChange={(e) => setSelectedEnvId(e.target.value)}
                className="bg-card text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Environments</option>
                {environments.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs text-muted-foreground">Loading relational parameters...</span>
          </div>
        ) : activeView === 'runs' ? (
          selectedRun ? (
            /* Selected Run Detail Screen */
            <div className="flex flex-col h-full min-h-0">
              {/* Header block */}
              <div className="border-b bg-muted/10 px-4 py-3 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRun(null)}
                      className="h-7 text-xs px-2 active:scale-[0.97] transition-all"
                    >
                      ← Runs Log
                    </Button>
                    <Badge variant="outline" className="h-6 font-semibold uppercase bg-background">
                      {selectedRun.projectName}
                    </Badge>
                    <Badge variant="secondary" className="h-6 bg-muted/50 text-xs font-semibold">
                      {selectedRun.environmentName || 'No Environment'}
                    </Badge>
                    <h2 className="text-sm font-bold tracking-tight ml-1">Run {selectedRun.buildNumber}</h2>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pl-1">
                    <span className="flex items-center gap-1"><GitBranchIcon className="size-3.5" />{selectedRun.branchName}</span>
                    {selectedRun.commitSha && (
                      <span className="flex items-center gap-1"><GitCommitIcon className="size-3.5" />{selectedRun.commitSha.substring(0, 7)}</span>
                    )}
                    <span>Started: {new Date(selectedRun.startedAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Sign Off Banner */}
                <div className="flex items-center gap-2 border bg-card p-2 rounded-sm max-w-md">
                  <ShieldCheckIcon className={cn(
                    "size-5 shrink-0",
                    selectedRun.signOffStatus === 'approved' && "text-green-500",
                    selectedRun.signOffStatus === 'blocked' && "text-red-500",
                    selectedRun.signOffStatus === 'pending' && "text-amber-500"
                  )} />
                  <div className="text-xs min-w-0">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <span>Sign-off:</span>
                      <span className={cn(
                        "uppercase text-[10px]",
                        selectedRun.signOffStatus === 'approved' && "text-green-500",
                        selectedRun.signOffStatus === 'blocked' && "text-red-500",
                        selectedRun.signOffStatus === 'pending' && "text-amber-500"
                      )}>{selectedRun.signOffStatus}</span>
                      {selectedRun.signOffBy && <span className="text-muted-foreground font-normal">by {selectedRun.signOffBy}</span>}
                    </div>
                    {selectedRun.signOffNotes && (
                      <p className="text-[10px] text-muted-foreground truncate" title={selectedRun.signOffNotes}>
                        &ldquo;{selectedRun.signOffNotes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Counter Bar */}
              <div className="grid grid-cols-5 border-b bg-card text-center divide-x select-none text-xs shrink-0 py-2">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Total Tests</span>
                  <span className="text-base font-bold">{selectedRun.totalTests}</span>
                </div>
                <div>
                  <span className="text-green-500 block text-[10px] uppercase font-semibold">Passed</span>
                  <span className="text-green-500 text-base font-bold">{selectedRun.passedTests}</span>
                </div>
                <div>
                  <span className="text-red-500 block text-[10px] uppercase font-semibold">Failed</span>
                  <span className="text-red-500 text-base font-bold">{selectedRun.failedTests}</span>
                </div>
                <div>
                  <span className="text-muted-foreground/60 block text-[10px] uppercase font-semibold">Skipped</span>
                  <span className="text-muted-foreground/60 text-base font-bold">{selectedRun.skippedTests}</span>
                </div>
                <div>
                  <span className="text-amber-500 block text-[10px] uppercase font-semibold">Flaky (Retried)</span>
                  <span className="text-amber-500 text-base font-bold">{selectedRun.flakyTests}</span>
                </div>
              </div>

              {/* Detailed results list */}
              <div className="flex-1 min-h-0 flex flex-col md:flex-row">
                <div className="flex-1 flex flex-col min-h-0 border-r">
                  {/* Results filter toolbar */}
                  <div className="px-4 py-2 border-b bg-muted/15 flex items-center justify-between shrink-0 select-none">
                    <span className="text-xs font-semibold text-muted-foreground">Test Case Results</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setRunResultsFilter('all')}
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-sm border",
                          runResultsFilter === 'all' ? "bg-muted text-foreground" : "text-muted-foreground bg-background"
                        )}
                      >
                        All ({runResults.length})
                      </button>
                      <button
                        onClick={() => setRunResultsFilter('failed')}
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-sm border",
                          runResultsFilter === 'failed' ? "bg-red-500/10 text-red-500 border-red-500/20" : "text-muted-foreground bg-background"
                        )}
                      >
                        Failed ({runResults.filter(r => r.status === 'failed').length})
                      </button>
                      <button
                        onClick={() => setRunResultsFilter('flaky')}
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-sm border",
                          runResultsFilter === 'flaky' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "text-muted-foreground bg-background"
                        )}
                      >
                        Flaky ({runResults.filter(r => r.isFlaky).length})
                      </button>
                    </div>
                  </div>

                  <ScrollArea className="flex-1">
                    {resultsLoading ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">Loading results...</div>
                    ) : filteredRunResults.length === 0 ? (
                      <div className="p-12 text-center text-xs text-muted-foreground">No matching test run results</div>
                    ) : (
                      <div className="divide-y">
                        {filteredRunResults.map((result) => (
                          <div key={result.id} className="p-3 hover:bg-muted/30 transition-colors flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {result.status === 'passed' ? (
                                    <CheckCircleIcon className="size-4 text-green-500 shrink-0" />
                                  ) : result.status === 'failed' ? (
                                    <XCircleIcon className="size-4 text-red-500 shrink-0" />
                                  ) : (
                                    <CircleIcon className="size-4 text-muted-foreground/50 shrink-0" />
                                  )}
                                  <span className="text-xs font-semibold truncate" title={result.testCaseTitle}>
                                    {result.testCaseTitle}
                                  </span>
                                  {result.isFlaky && (
                                    <Badge variant="outline" className="h-5 text-[9px] bg-amber-500/10 border-amber-500/20 text-amber-500 font-semibold px-1 rounded-sm">
                                      Flaky (Retry {result.retryAttempts})
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                                  {result.suiteTitle} &middot; {result.suiteFilePath}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 select-none">
                                <Badge variant="outline" className="px-1.5 py-0 rounded-sm text-[9px] bg-muted/20">
                                  {result.browser}
                                </Badge>
                                {result.device && (
                                  <Badge variant="outline" className="px-1.5 py-0 rounded-sm text-[9px] bg-muted/20">
                                    {result.device}
                                  </Badge>
                                )}
                                <span>{(result.durationMs / 1000).toFixed(2)}s</span>
                              </div>
                            </div>

                            {/* Failure details and Error Signatures mapping */}
                            {result.status === 'failed' && (
                              <div className="rounded border border-red-500/10 bg-red-500/5 p-2 text-xs font-mono">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-red-500 break-all leading-normal whitespace-pre-wrap">{result.errorMessage}</p>
                                  {result.errorId && (
                                    <Badge variant="secondary" className="bg-red-500/15 border-red-500/20 text-red-500 text-[8px] tracking-wide select-none rounded-sm px-1 font-semibold hover:bg-red-500/20">
                                      SIGNATURE LINKED
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Artifact Links */}
                            {(result.traceUrl || result.videoUrl || result.screenshotUrl) && (
                              <div className="flex items-center gap-2 select-none text-[10px] mt-0.5">
                                <span className="text-muted-foreground">Artifacts:</span>
                                {result.traceUrl && (
                                  <a href={result.traceUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                                    Playwright Trace
                                  </a>
                                )}
                                {result.videoUrl && (
                                  <a href={result.videoUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                                    Video
                                  </a>
                                )}
                                {result.screenshotUrl && (
                                  <a href={result.screenshotUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                                    Screenshot
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Sidebar error analytics */}
                <div className="w-full md:w-[320px] shrink-0 flex flex-col bg-muted/10 min-h-0 select-none">
                  <div className="p-3 border-b bg-muted/20">
                    <span className="text-xs font-semibold text-muted-foreground block">Error Signatures Summary</span>
                    <span className="text-[10px] text-muted-foreground">Deduplicated failure triggers detected in this execution run.</span>
                  </div>
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-3">
                      {runResults.filter(r => r.status === 'failed' && r.errorMessage).length === 0 ? (
                        <div className="text-center py-6 text-xs text-muted-foreground">No errors captured in this run</div>
                      ) : (
                        /* Group run results by error message signatures */
                        Object.entries(
                          runResults.reduce((acc, curr) => {
                            if (curr.status === 'failed' && curr.errorMessage) {
                              const key = curr.errorMessage.split('\n')[0] || 'Unknown error';
                              acc[key] = (acc[key] || 0) + 1;
                            }
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([errorMsg, count], i) => (
                          <div key={i} className="p-2.5 rounded border border-border bg-card space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] font-semibold text-red-500 uppercase tracking-wide">
                                Error Group {i+1}
                              </span>
                              <Badge className="bg-red-500 text-white text-[9px] px-1.5 py-0 rounded-sm">
                                {count} failure{count !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <p className="text-[11px] font-mono leading-relaxed break-all bg-muted/50 p-1.5 rounded text-foreground/80">
                              {errorMsg}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          ) : (
            /* Runs List Screen */
            <div className="flex flex-col h-full min-h-0">
              <ScrollArea className="flex-1">
                {runs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center h-48 select-none">
                    <ClockCounterClockwiseIcon className="size-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-semibold text-muted-foreground">No execution runs found</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Make sure you have seeded or configured mock projects and environments.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {runs.map((run) => (
                      <div
                        key={run.id}
                        onClick={() => setSelectedRun(run)}
                        className="p-4 hover:bg-muted/40 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {run.status === 'passed' ? (
                              <CheckCircleIcon className="size-4.5 text-green-500 shrink-0" />
                            ) : run.status === 'failed' ? (
                              <XCircleIcon className="size-4.5 text-red-500 shrink-0" />
                            ) : (
                              <CircleIcon className="size-4.5 text-muted-foreground/60 shrink-0 animate-pulse" />
                            )}
                            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                              Run {run.buildNumber}
                            </span>
                            <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 py-0 bg-background rounded-sm">
                              {run.projectName}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-muted/40 rounded-sm">
                              {run.environmentName || 'No Env'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground select-none">
                            <span className="flex items-center gap-1"><GitBranchIcon className="size-3" />{run.branchName}</span>
                            {run.commitSha && (
                              <span className="flex items-center gap-1 font-mono"><GitCommitIcon className="size-3" />{run.commitSha.substring(0, 7)}</span>
                            )}
                            <span>{new Date(run.startedAt).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Middle Counters Section */}
                        <div className="flex items-center gap-4 text-center select-none text-[11px]">
                          <div>
                            <span className="text-muted-foreground block text-[9px] uppercase font-semibold">Total</span>
                            <span className="font-bold">{run.totalTests}</span>
                          </div>
                          <div>
                            <span className="text-green-500 block text-[9px] uppercase font-semibold">Passed</span>
                            <span className="text-green-500 font-bold">{run.passedTests}</span>
                          </div>
                          {run.failedTests > 0 && (
                            <div>
                              <span className="text-red-500 block text-[9px] uppercase font-semibold">Failed</span>
                              <span className="text-red-500 font-bold">{run.failedTests}</span>
                            </div>
                          )}
                          {run.flakyTests > 0 && (
                            <div>
                              <span className="text-amber-500 block text-[9px] uppercase font-semibold">Flaky</span>
                              <span className="text-amber-500 font-bold">{run.flakyTests}</span>
                            </div>
                          )}
                        </div>

                        {/* Sign-off Status Section */}
                        <div className="flex items-center gap-3 shrink-0 select-none">
                          <div className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-[9px] text-muted-foreground uppercase">Sign-off:</span>
                              <span className={cn(
                                "text-[9px] uppercase font-bold",
                                run.signOffStatus === 'approved' && "text-green-500",
                                run.signOffStatus === 'blocked' && "text-red-500",
                                run.signOffStatus === 'pending' && "text-amber-500"
                              )}>
                                {run.signOffStatus}
                              </span>
                            </div>
                            {run.signOffBy && (
                              <span className="text-[10px] text-muted-foreground block">
                                Approved by {run.signOffBy}
                              </span>
                            )}
                          </div>
                          <ArrowRightIcon className="size-4 text-muted-foreground/35 group-hover:text-primary transition-all group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )
        ) : activeView === 'errors' ? (
          /* Error Signatures deduplication list */
          <div className="flex flex-col h-full min-h-0">
            <div className="p-3 border-b bg-muted/10 select-none">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Playwright Error Deduplication Catalog
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically isolates and identifies duplicate failures across your test execution suites.
              </p>
            </div>
            <ScrollArea className="flex-1 p-4">
              {errorSignatures.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">No error signatures registered</div>
              ) : (
                <div className="space-y-4">
                  {errorSignatures.map((err) => (
                    <div key={err.id} className="border rounded bg-card p-4 space-y-2 flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] uppercase font-bold px-1.5 py-0 rounded-sm">
                            Error Signature
                          </Badge>
                          <span className="text-[10px] font-mono text-muted-foreground select-all bg-muted px-1 rounded">
                            {err.errorHash}
                          </span>
                        </div>
                        <p className="text-xs font-mono break-all leading-normal whitespace-pre-wrap bg-muted/50 p-2.5 rounded text-foreground/90 font-medium border border-border/40">
                          {err.errorMessageSummary}
                        </p>
                      </div>
                      <div className="text-right text-[10px] text-muted-foreground shrink-0 select-none">
                        <span>First Seen: {new Date(err.firstSeenAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          /* Schema Explorer & SVG Visualizer */
          <div className="flex flex-col md:flex-row h-full min-h-0">
            {/* SVG Interactive Canvas */}
            <div className="flex-1 flex flex-col min-h-0 bg-muted/5 border-r relative p-4">
              <div className="absolute top-3 left-4 z-10 select-none">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  Interactive relational entity map
                </span>
                <span className="text-[9px] block text-muted-foreground/70">
                  Hover over a table or a connection to highlight dependencies.
                </span>
              </div>

              {/* ERD SVG representation */}
              <div className="flex-1 flex items-center justify-center p-4">
                <svg
                  viewBox="0 0 900 500"
                  className="w-full h-full max-h-[460px] select-none text-[10px] font-medium"
                >
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 2 L 8 5 L 0 8 z" fill="hsl(var(--muted-foreground) / 0.5)" />
                    </marker>
                    <marker id="arrow-highlight" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 2 L 8 5 L 0 8 z" fill="hsl(var(--primary))" />
                    </marker>
                  </defs>

                  {/* Connection Links */}
                  <g>
                    {/* Project -> TestSuite */}
                    <path
                      d="M 210 120 L 290 120"
                      stroke={hoveredTable === 'projects' || hoveredTable === 'test_suites' ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)"}
                      strokeWidth={hoveredTable === 'projects' || hoveredTable === 'test_suites' ? 2 : 1}
                      markerEnd={hoveredTable === 'projects' || hoveredTable === 'test_suites' ? "url(#arrow-highlight)" : "url(#arrow)"}
                      fill="none"
                    />

                    {/* Project -> RegressionRun */}
                    <path
                      d="M 150 160 L 150 250"
                      stroke={hoveredTable === 'projects' || hoveredTable === 'regression_runs' ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)"}
                      strokeWidth={hoveredTable === 'projects' || hoveredTable === 'regression_runs' ? 2 : 1}
                      markerEnd={hoveredTable === 'projects' || hoveredTable === 'regression_runs' ? "url(#arrow-highlight)" : "url(#arrow)"}
                      fill="none"
                    />

                    {/* Environment -> RegressionRun */}
                    <path
                      d="M 290 300 L 210 300"
                      stroke={hoveredTable === 'execution_environments' || hoveredTable === 'regression_runs' ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)"}
                      strokeWidth={hoveredTable === 'execution_environments' || hoveredTable === 'regression_runs' ? 2 : 1}
                      markerEnd={hoveredTable === 'execution_environments' || hoveredTable === 'regression_runs' ? "url(#arrow-highlight)" : "url(#arrow)"}
                      fill="none"
                    />

                    {/* TestSuite -> TestCase */}
                    <path
                      d="M 350 160 L 350 250"
                      stroke={hoveredTable === 'test_suites' || hoveredTable === 'test_cases' ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)"}
                      strokeWidth={hoveredTable === 'test_suites' || hoveredTable === 'test_cases' ? 2 : 1}
                      markerEnd={hoveredTable === 'test_suites' || hoveredTable === 'test_cases' ? "url(#arrow-highlight)" : "url(#arrow)"}
                      fill="none"
                    />

                    {/* TestCase -> TestRunResult */}
                    <path
                      d="M 410 300 L 490 300"
                      stroke={hoveredTable === 'test_cases' || hoveredTable === 'test_run_results' ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)"}
                      strokeWidth={hoveredTable === 'test_cases' || hoveredTable === 'test_run_results' ? 2 : 1}
                      markerEnd={hoveredTable === 'test_cases' || hoveredTable === 'test_run_results' ? "url(#arrow-highlight)" : "url(#arrow)"}
                      fill="none"
                    />

                    {/* RegressionRun -> TestRunResult */}
                    <path
                      d="M 150 350 L 150 440 L 490 440 L 530 350"
                      stroke={hoveredTable === 'regression_runs' || hoveredTable === 'test_run_results' ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)"}
                      strokeWidth={hoveredTable === 'regression_runs' || hoveredTable === 'test_run_results' ? 2 : 1}
                      markerEnd={hoveredTable === 'regression_runs' || hoveredTable === 'test_run_results' ? "url(#arrow-highlight)" : "url(#arrow)"}
                      fill="none"
                    />

                    {/* ErrorSignature -> TestRunResult */}
                    <path
                      d="M 690 160 L 690 250"
                      stroke={hoveredTable === 'error_signatures' || hoveredTable === 'test_run_results' ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)"}
                      strokeWidth={hoveredTable === 'error_signatures' || hoveredTable === 'test_run_results' ? 2 : 1}
                      markerEnd={hoveredTable === 'error_signatures' || hoveredTable === 'test_run_results' ? "url(#arrow-highlight)" : "url(#arrow)"}
                      fill="none"
                    />
                  </g>

                  {/* 1. Projects Entity Card */}
                  <g
                    onMouseEnter={() => setHoveredTable('projects')}
                    onMouseLeave={() => setHoveredTable(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x="90" y="80" width="120" height="80" rx="3"
                      fill="hsl(var(--card))"
                      stroke={hoveredTable === 'projects' ? "hsl(var(--primary))" : "hsl(var(--border))"}
                      strokeWidth={hoveredTable === 'projects' ? 2 : 1}
                    />
                    <rect x="90" y="80" width="120" height="20" rx="2" fill="hsl(var(--muted))" />
                    <text x="100" y="94" fontWeight="bold" fill="hsl(var(--foreground))">projects</text>
                    <text x="100" y="115" fill="hsl(var(--muted-foreground))">PK | id (UUID)</text>
                    <text x="100" y="130" fill="hsl(var(--foreground))">name (VARCHAR)</text>
                    <text x="100" y="145" fill="hsl(var(--muted-foreground))">repository_url</text>
                  </g>

                  {/* 2. Execution Environments Entity Card */}
                  <g
                    onMouseEnter={() => setHoveredTable('execution_environments')}
                    onMouseLeave={() => setHoveredTable(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x="290" y="250" width="120" height="80" rx="3"
                      fill="hsl(var(--card))"
                      stroke={hoveredTable === 'execution_environments' ? "hsl(var(--primary))" : "hsl(var(--border))"}
                      strokeWidth={hoveredTable === 'execution_environments' ? 2 : 1}
                    />
                    <rect x="290" y="250" width="120" height="20" rx="2" fill="hsl(var(--muted))" />
                    <text x="300" y="264" fontWeight="bold" fill="hsl(var(--foreground))">execution_envs</text>
                    <text x="300" y="285" fill="hsl(var(--muted-foreground))">PK | id (UUID)</text>
                    <text x="300" y="300" fill="hsl(var(--foreground))">name (VARCHAR)</text>
                    <text x="300" y="315" fill="hsl(var(--muted-foreground))">description</text>
                  </g>

                  {/* 3. Regression Runs Entity Card */}
                  <g
                    onMouseEnter={() => setHoveredTable('regression_runs')}
                    onMouseLeave={() => setHoveredTable(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x="90" y="250" width="120" height="100" rx="3"
                      fill="hsl(var(--card))"
                      stroke={hoveredTable === 'regression_runs' ? "hsl(var(--primary))" : "hsl(var(--border))"}
                      strokeWidth={hoveredTable === 'regression_runs' ? 2 : 1}
                    />
                    <rect x="90" y="250" width="120" height="20" rx="2" fill="hsl(var(--muted))" />
                    <text x="100" y="264" fontWeight="bold" fill="hsl(var(--foreground))">regression_runs</text>
                    <text x="100" y="285" fill="hsl(var(--muted-foreground))">PK | id (UUID)</text>
                    <text x="100" y="300" fill="hsl(var(--foreground))">FK | project_id</text>
                    <text x="100" y="315" fill="hsl(var(--foreground))">FK | environment_id</text>
                    <text x="100" y="330" fill="hsl(var(--muted-foreground))">build_number</text>
                    <text x="100" y="342" fill="hsl(var(--muted-foreground))">+ cache counters</text>
                  </g>

                  {/* 4. Test Suites Entity Card */}
                  <g
                    onMouseEnter={() => setHoveredTable('test_suites')}
                    onMouseLeave={() => setHoveredTable(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x="290" y="80" width="120" height="80" rx="3"
                      fill="hsl(var(--card))"
                      stroke={hoveredTable === 'test_suites' ? "hsl(var(--primary))" : "hsl(var(--border))"}
                      strokeWidth={hoveredTable === 'test_suites' ? 2 : 1}
                    />
                    <rect x="290" y="80" width="120" height="20" rx="2" fill="hsl(var(--muted))" />
                    <text x="300" y="94" fontWeight="bold" fill="hsl(var(--foreground))">test_suites</text>
                    <text x="300" y="115" fill="hsl(var(--muted-foreground))">PK | id (UUID)</text>
                    <text x="300" y="130" fill="hsl(var(--foreground))">FK | project_id</text>
                    <text x="300" y="145" fill="hsl(var(--foreground))">file_path (TEXT)</text>
                  </g>

                  {/* 5. Test Cases Entity Card */}
                  <g
                    onMouseEnter={() => setHoveredTable('test_cases')}
                    onMouseLeave={() => setHoveredTable(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x="290" y="250" width="120" height="100" rx="3"
                      transform="translate(0, 110)"
                      fill="hsl(var(--card))"
                      stroke={hoveredTable === 'test_cases' ? "hsl(var(--primary))" : "hsl(var(--border))"}
                      strokeWidth={hoveredTable === 'test_cases' ? 2 : 1}
                    />
                    <rect x="290" y="250" width="120" height="20" rx="2" transform="translate(0, 110)" fill="hsl(var(--muted))" />
                    <text x="300" y="374" fontWeight="bold" fill="hsl(var(--foreground))">test_cases</text>
                    <text x="300" y="395" fill="hsl(var(--muted-foreground))">PK | id (UUID)</text>
                    <text x="300" y="410" fill="hsl(var(--foreground))">FK | suite_id</text>
                    <text x="300" y="425" fill="hsl(var(--muted-foreground))">title (TEXT)</text>
                    <text x="300" y="440" fill="hsl(var(--foreground))">unique_signature</text>
                  </g>

                  {/* 6. Error Signatures Entity Card */}
                  <g
                    onMouseEnter={() => setHoveredTable('error_signatures')}
                    onMouseLeave={() => setHoveredTable(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x="630" y="80" width="120" height="80" rx="3"
                      fill="hsl(var(--card))"
                      stroke={hoveredTable === 'error_signatures' ? "hsl(var(--primary))" : "hsl(var(--border))"}
                      strokeWidth={hoveredTable === 'error_signatures' ? 2 : 1}
                    />
                    <rect x="630" y="80" width="120" height="20" rx="2" fill="hsl(var(--muted))" />
                    <text x="640" y="94" fontWeight="bold" fill="hsl(var(--foreground))">error_signatures</text>
                    <text x="640" y="115" fill="hsl(var(--muted-foreground))">PK | id (UUID)</text>
                    <text x="640" y="130" fill="hsl(var(--foreground))">error_hash (TEXT)</text>
                    <text x="640" y="145" fill="hsl(var(--muted-foreground))">error_summary</text>
                  </g>

                  {/* 7. Test Case Results Entity Card */}
                  <g
                    onMouseEnter={() => setHoveredTable('test_run_results')}
                    onMouseLeave={() => setHoveredTable(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x="490" y="250" width="120" height="110" rx="3"
                      fill="hsl(var(--card))"
                      stroke={hoveredTable === 'test_run_results' ? "hsl(var(--primary))" : "hsl(var(--border))"}
                      strokeWidth={hoveredTable === 'test_run_results' ? 2 : 1}
                    />
                    <rect x="490" y="250" width="120" height="20" rx="2" fill="hsl(var(--muted))" />
                    <text x="500" y="264" fontWeight="bold" fill="hsl(var(--foreground))">test_run_results</text>
                    <text x="500" y="285" fill="hsl(var(--muted-foreground))">PK | id (UUID)</text>
                    <text x="500" y="300" fill="hsl(var(--foreground))">FK | run_id</text>
                    <text x="500" y="315" fill="hsl(var(--foreground))">FK | test_case_id</text>
                    <text x="500" y="330" fill="hsl(var(--foreground))">FK | error_id</text>
                    <text x="500" y="342" fill="hsl(var(--muted-foreground))">is_flaky (BOOL)</text>
                    <text x="500" y="354" fill="hsl(var(--muted-foreground))">browser, duration</text>
                  </g>
                </svg>
              </div>
            </div>

            {/* Recommended Indexes panel */}
            <div className="w-full md:w-[360px] shrink-0 bg-muted/10 p-4 min-h-0 flex flex-col select-none">
              <div className="pb-3 border-b mb-3">
                <span className="text-xs font-semibold text-muted-foreground block">
                  Recommended Indexes & Optimization
                </span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Execute these composite indexes inside your database to guarantee sub-second loads at scale.
                </span>
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-4">
                  {recommendedIndexes.map((idx, i) => (
                    <div key={i} className="border bg-card rounded p-3 space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-primary block">{idx.name}</span>
                        <span className="text-[9px] text-muted-foreground">Table: {idx.table} ({idx.columns})</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        {idx.description}
                      </p>
                      <div className="flex items-center justify-between gap-2 border rounded bg-muted/40 p-1.5">
                        <code className="text-[9px] font-mono truncate text-muted-foreground/80 flex-1">{idx.sql}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 hover:bg-muted active:scale-[0.97] transition-all"
                          onClick={() => copyToClipboard(idx.sql, idx.name)}
                        >
                          {copiedIndex === idx.name ? (
                            <CheckIcon className="size-3 text-green-500" />
                          ) : (
                            <CopyIcon className="size-3 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
