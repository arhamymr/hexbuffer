'use client';

import { AlertCircle, ArrowDown, ArrowUp, Copy, FileDown, Loader2, Minus, ShieldAlert, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusBadge } from './status-badge';
import type { TestResult } from './types';

interface PromptInjectionResultPaneProps {
  results: TestResult[];
  selectedResult: TestResult | null;
  isRunning: boolean;
  currentRunningIndex: number;
  runTotal: number;
  successCount: number;
  anomalyCount: number;
  onSelectResult: (id: string) => void;
  onCopySelectedResponse: () => void;
  onExportResults: () => void;
  onClearResults: () => void;
}

export function PromptInjectionResultPane({
  results,
  selectedResult,
  isRunning,
  currentRunningIndex,
  runTotal,
  successCount,
  anomalyCount,
  onSelectResult,
  onCopySelectedResponse,
  onExportResults,
  onClearResults,
}: PromptInjectionResultPaneProps) {
  return (
    <div className="flex min-h-0 flex-col">
      <div className="bg-muted h-10 px-3 py-2 border-b flex items-center justify-between">
        <span className="text-sm font-medium">Result</span>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{successCount} completed</Badge>
          {anomalyCount > 0 && <Badge variant="destructive">{anomalyCount} flagged</Badge>}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 text-xs text-muted-foreground">
            {isRunning ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Testing {currentRunningIndex + 1} of {runTotal}
              </span>
            ) : (
              <span>{results.length} responses</span>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="xs" className="h-8 px-2" onClick={onCopySelectedResponse} disabled={!selectedResult}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="xs" className="h-8 px-2" onClick={onExportResults} disabled={results.length === 0}>
              <FileDown className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="xs" className="h-8 px-2" onClick={onClearResults} disabled={results.length === 0 || isRunning}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="min-h-[180px] rounded-md border bg-background">
          {results.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <ShieldAlert className="h-8 w-8" />
              <p className="text-xs">No test results yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {results.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className={`grid w-full grid-cols-[42px_minmax(0,1fr)_72px_72px] items-center gap-2 p-2 text-left text-xs hover:bg-muted/50 ${
                    selectedResult?.id === result.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => onSelectResult(result.id)}
                >
                  <span className="text-muted-foreground">#{result.index + 1}</span>
                  <span className="truncate font-mono" title={result.payload}>
                    {result.payload}
                  </span>
                  <StatusBadge result={result} />
                  <span
                    className={`flex items-center justify-end gap-1 ${
                      result.lengthDelta > 0
                        ? 'text-green-600'
                        : result.lengthDelta < 0
                          ? 'text-red-600'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {result.lengthDelta > 0 ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : result.lengthDelta < 0 ? (
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    {result.lengthDelta === 0 ? '-' : Math.abs(result.lengthDelta)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex min-h-0 flex-1 flex-col rounded-md border bg-background">
          <div className="flex items-center justify-between border-b p-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{selectedResult?.payload || 'Response Preview'}</p>
              <p className="truncate text-xs text-muted-foreground">
                {selectedResult?.requestUrl || 'Select a result to inspect the response body.'}
              </p>
            </div>
            {selectedResult?.isAnomaly && (
              <Badge variant="destructive" className="ml-2 gap-1">
                <AlertCircle className="h-3 w-3" />
                Flagged
              </Badge>
            )}
          </div>
          <ScrollArea className="min-h-[220px] flex-1">
            {selectedResult ? (
              <div className="space-y-3 p-3">
                {selectedResult.findings.length > 0 && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs">
                    Matched response terms: {selectedResult.findings.join(', ')}
                  </div>
                )}
                {selectedResult.error ? (
                  <pre className="whitespace-pre-wrap text-xs text-destructive">{selectedResult.error}</pre>
                ) : (
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                    {selectedResult.body || '(empty response)'}
                  </pre>
                )}
              </div>
            ) : (
              <div className="flex min-h-[220px] items-center justify-center text-xs text-muted-foreground">
                Response details will appear here.
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
