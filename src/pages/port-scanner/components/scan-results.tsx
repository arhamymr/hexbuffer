import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BroadcastIcon,
  SpinnerGapIcon,
  CheckCircleIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import type { PortScanResult } from '../types';
import type { PortPreset } from '../constants';

interface ScanResultsProps {
  openResults: PortScanResult[];
  hasResults: boolean;
  isRunning: boolean;
  hasRun: boolean;
  progress: { current: number; total: number };
  error: string;
  target: string;
  concurrency: string;
  onClear: () => void;
  onQuickStart: (preset: PortPreset) => void;
}

export function ScanResults({
  openResults,
  hasResults,
  isRunning,
  hasRun,
  progress,
  error,
  target,
  concurrency,
  onClear,
  onQuickStart,
}: ScanResultsProps) {
  // ponytail: calculate percentage in-line safely
  const percent = useMemo(() => {
    if (!progress.total) return 0;
    return Math.min(100, Math.round((progress.current / progress.total) * 100));
  }, [progress.current, progress.total]);

  // 1. Initial State (Welcome / Onboarding)
  if (!hasRun) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 bg-background/30 text-center select-none max-w-2xl mx-auto space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          <div className="relative flex items-center justify-center h-16 w-16 rounded-full border border-primary/20 bg-background/80 shadow-inner">
            <BroadcastIcon className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Network Port Scanner
          </h1>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Scan hostnames or IP addresses to discover open ports, identify running services,
            and extract server banners.
          </p>
        </div>

        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <button
            type="button"
            onClick={() => onQuickStart('quick')}
            className="flex flex-col items-start p-3.5 rounded-sm border bg-card/45 hover:bg-muted/10 hover:border-primary/30 text-left transition-all active:scale-[0.97] outline-none group cursor-pointer"
          >
            <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">Quick Scan</span>
            <span className="text-[10px] text-muted-foreground mt-1 leading-snug">
              Scan top 18 common ports (web, ssh, db)
            </span>
          </button>
          <button
            type="button"
            onClick={() => onQuickStart('web')}
            className="flex flex-col items-start p-3.5 rounded-sm border bg-card/45 hover:bg-muted/10 hover:border-primary/30 text-left transition-all active:scale-[0.97] outline-none group cursor-pointer"
          >
            <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">Web Ports</span>
            <span className="text-[10px] text-muted-foreground mt-1 leading-snug">
              Scan common HTTP/HTTPS, proxies, and web services
            </span>
          </button>
          <button
            type="button"
            onClick={() => onQuickStart('top100')}
            className="flex flex-col items-start p-3.5 rounded-sm border bg-card/45 hover:bg-muted/10 hover:border-primary/30 text-left transition-all active:scale-[0.97] outline-none group cursor-pointer"
          >
            <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">Top 100 Ports</span>
            <span className="text-[10px] text-muted-foreground mt-1 leading-snug">
              Scan top 100 common network services
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* 2. Active Scan Progress Dashboard */}
      {isRunning && (
        <div className="p-4 border-b bg-muted/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SpinnerGapIcon className="h-4 w-4 text-primary animate-spin" />
              <span className="text-xs font-semibold text-foreground">
                Scanning target: <code className="text-primary font-mono text-[11px] bg-primary/10 px-1 py-0.5 rounded">{target || 'N/A'}</code>
              </span>
            </div>
            <Badge variant="secondary">
              {percent}% Complete
            </Badge>
          </div>

          <Progress value={percent} className="h-1.5 bg-muted/40" />

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card/30 p-2.5 rounded border border-muted/50">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                Progress
              </div>
              <div className="text-xs font-mono font-bold mt-0.5 text-foreground">
                {progress.current} / {progress.total}
              </div>
            </div>
            <div className="bg-card/30 p-2.5 rounded border border-muted/50">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                Discovered Ports
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <div className="text-xs font-mono font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
                {openResults.length} Open
              </div>
            </div>
            <div className="bg-card/30 p-2.5 rounded border border-muted/50">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                Concurrency
              </div>
              <div className="text-xs font-mono font-bold mt-0.5 text-foreground">
                {concurrency} threads
              </div>
            </div>
            <div className="bg-card/30 p-2.5 rounded border border-muted/50">
              <div className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider">
                Status
              </div>
              <div className="text-xs font-medium mt-0.5 text-primary">
                Active Scan
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Completed Scan Header Bar */}
      {!isRunning && (
        <div className="flex h-12 shrink-0 items-center justify-between border-b bg-muted/10 px-4">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold text-foreground">
              Scan completed on <code className="font-mono text-[11px] text-muted-foreground">{target}</code>
            </span>
            <Badge variant="outline">
              {openResults.length} Open Ports
            </Badge>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="h-7 w-7 text-muted-foreground hover:text-foreground active:scale-[0.97] transition-all"
              title="Clear results"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Error alert if any */}
      {error && (
        <div className="px-4 py-2 border-b bg-destructive/10 text-destructive font-mono text-[11px] flex items-center justify-between">
          <span>Error: {error}</span>
          <Button variant="ghost" size="sm" onClick={onClear} className="h-5 px-1.5 text-[10px] text-destructive hover:bg-destructive/10">
            Dismiss
          </Button>
        </div>
      )}

      {/* Results List Section */}
      <main className="min-h-0 flex-1 overflow-auto">
        {!hasResults ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground bg-background/25">
            <BroadcastIcon className="h-8 w-8 text-muted-foreground/30 animate-pulse" />
            <p className="text-xs">No open ports discovered</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <Table className="text-xs">
              <TableHeader className="sticky top-0 z-10 bg-background border-b shadow-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 py-0">Host</TableHead>
                  <TableHead className="h-9 py-0 w-24">Port</TableHead>
                  <TableHead className="h-9 py-0 w-24">State</TableHead>
                  <TableHead className="h-9 py-0 w-28">Service</TableHead>
                  <TableHead className="h-9 py-0 w-28">Latency</TableHead>
                  <TableHead className="h-9 py-0">Banner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openResults.map((result) => {
                  const ms = result.response_time_ms || 0;
                  // Latency color
                  let latencyColor = 'bg-emerald-500';
                  if (ms > 300) latencyColor = 'bg-yellow-500';
                  if (ms > 800) latencyColor = 'bg-red-500';

                  return (
                    <TableRow key={`${result.host}:${result.port}`} className="hover:bg-muted/20 border-b transition-colors">
                      <TableCell className="font-mono py-2 font-medium">{result.host}</TableCell>
                      <TableCell className="font-mono py-2 font-semibold text-primary">{result.port}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline">
                          {result.state}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 font-medium capitalize text-muted-foreground">
                        {result.service || 'unknown'}
                      </TableCell>
                      <TableCell className="py-2 text-muted-foreground font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] w-10 text-right">{ms ? `${ms}ms` : '-'}</span>
                          {ms > 0 && (
                            <span className="w-12 h-1 bg-muted rounded-full overflow-hidden inline-block">
                              <span
                                className={`h-full block rounded-full ${latencyColor}`}
                                style={{ width: `${Math.min(100, (ms / 1000) * 100)}%` }}
                              />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className="max-w-[400px] truncate font-mono text-[11px] py-2 text-foreground/80"
                        title={result.banner ?? ''}
                      >
                        {result.banner ? (
                          <code className="bg-muted/30 px-1 py-0.5 rounded text-[10px] select-all max-w-[350px] truncate block">
                            {result.banner}
                          </code>
                        ) : (
                          <span className="text-muted-foreground/40">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}
