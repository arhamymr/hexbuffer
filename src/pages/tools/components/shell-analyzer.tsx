'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Copy, Trash2, FileCode, Shield, Globe, Terminal, Lock,
  AlertTriangle, Info, ChevronDown, ChevronRight,
} from 'lucide-react';
import { analyzeShellScript } from '../lib/shell-analyzer';
import { useToolsStore } from '@/stores/tools';
import type { ShellAnalysisResult, ShellInsight, ShellInsightSeverity } from '../types';

const SEVERITY_CONFIG: Record<ShellInsightSeverity, { color: string; icon: React.ElementType }> = {
  critical: { color: 'text-red-500 border-red-500/30 bg-red-500/10', icon: AlertTriangle },
  high: { color: 'text-orange-500 border-orange-500/30 bg-orange-500/10', icon: Shield },
  medium: { color: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10', icon: AlertTriangle },
  low: { color: 'text-blue-500 border-blue-500/30 bg-blue-500/10', icon: Info },
  info: { color: 'text-muted-foreground border-border bg-muted', icon: Info },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  network: Globe,
  'privilege-escalation': Lock,
  'code-execution': Terminal,
  filesystem: FileCode,
};

function InsightCard({ insight }: { insight: ShellInsight }) {
  const [expanded, setExpanded] = React.useState(false);
  const config = SEVERITY_CONFIG[insight.severity];
  const Icon = config.icon;
  const CategoryIcon = CATEGORY_ICONS[insight.category];

  return (
    <div className={`border rounded-md px-3 py-2 ${config.color}`}>
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded
          ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {CategoryIcon && <CategoryIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />}
        <span className="text-sm font-medium truncate">{insight.title}</span>
        <Badge variant="outline" className="ml-auto shrink-0 text-[10px] px-1.5 py-0">
          {insight.severity}
        </Badge>
      </button>
      {expanded && (
        <div className="mt-2 pl-6 space-y-1.5">
          <p className="text-xs opacity-80">{insight.description}</p>
          {insight.evidence.length > 0 && (
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase tracking-wider opacity-50">Evidence</span>
              {insight.evidence.map((ev, i) => (
                <code key={i} className="block text-[11px] font-mono truncate opacity-70">{ev}</code>
              ))}
            </div>
          )}
          {insight.lineNumbers.length > 0 && (
            <span className="text-[10px] opacity-50">
              Lines: {insight.lineNumbers.join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function StatsBar({ result }: { result: ShellAnalysisResult }) {
  const { meta, insights, commands } = result;
  const severityCounts = insights.reduce((acc, i) => {
    acc[i.severity] = (acc[i.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span>{meta.totalLines} lines</span>
      <span className="opacity-30">|</span>
      <span>{commands.length} commands</span>
      <span className="opacity-30">|</span>
      <span>{meta.variableCount} variables</span>
      <span className="opacity-30">|</span>
      <span>{meta.functionCount} functions</span>
      {meta.shebang && (
        <>
          <span className="opacity-30">|</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">{meta.shebang}</Badge>
        </>
      )}
      <div className="ml-auto flex items-center gap-1.5">
        {severityCounts.critical > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-500/30 text-red-500">
            {severityCounts.critical} critical
          </Badge>
        )}
        {severityCounts.high > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-500/30 text-orange-500">
            {severityCounts.high} high
          </Badge>
        )}
        {severityCounts.medium > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/30 text-yellow-500">
            {severityCounts.medium} medium
          </Badge>
        )}
        {severityCounts.low > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-500">
            {severityCounts.low} low
          </Badge>
        )}
        {severityCounts.info > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {severityCounts.info} info
          </Badge>
        )}
      </div>
    </div>
  );
}

export function ShellAnalyzerTool() {
  const [input, setInput] = React.useState('');
  const [result, setResult] = React.useState<ShellAnalysisResult | null>(null);
  const consumePendingScriptInput = useToolsStore((s) => s.consumePendingScriptInput);

  React.useEffect(() => {
    const pending = consumePendingScriptInput();
    if (pending) {
      setInput(pending);
    }
  }, [consumePendingScriptInput]);

  const handleAnalyze = React.useCallback(() => {
    if (!input.trim()) {
      setResult(null);
      return;
    }
    setResult(analyzeShellScript(input));
  }, [input]);

  React.useEffect(() => {
    handleAnalyze();
  }, [handleAnalyze]);

  const handleCopyReport = async () => {
    if (!result) return;
    const report = result.insights
      .map(i =>
        `[${i.severity.toUpperCase()}] ${i.title}: ${i.description}`
        + (i.evidence.length ? `\n  Evidence: ${i.evidence.join(', ')}` : '')
        + (i.lineNumbers.length ? `\n  Lines: ${i.lineNumbers.join(', ')}` : '')
      )
      .join('\n\n');
    await navigator.clipboard.writeText(report);
  };

  const handleClear = () => {
    setInput('');
    setResult(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="bg-muted px-3 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-normal">
              Deterministic shell / bash script analyzer
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleCopyReport} disabled={!result?.insights.length}>
              <Copy className="h-3.5 w-3.5" />
              Copy Report
            </Button>
            <Button variant="ghost" onClick={handleClear} disabled={!input && !result}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 border-t">
        <section className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col border-b bg-background lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
              <div>
                <span className="text-sm font-medium">Script Input</span>
                <div className="text-xs text-muted-foreground">
                  Paste a shell script to analyze.
                </div>
              </div>
              <Button variant="ghost" onClick={handleClear} disabled={!input}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-sm shadow-none focus-visible:ring-0"
              placeholder={"#!/usr/bin/env bash\nset -euo pipefail\n\n# Paste your script here..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          <div className="flex min-h-0 flex-col bg-background">
            <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
              <div>
                <span className="text-sm font-medium">Analysis Results</span>
                <div className="text-xs text-muted-foreground">
                  {result ? `${result.insights.length} finding(s)` : 'Findings will appear here.'}
                </div>
              </div>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-3 space-y-3">
                {result && <StatsBar result={result} />}
                {result?.insights.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Shield className="h-8 w-8 mb-2 opacity-30" />
                    <span className="text-sm">No findings — script looks clean.</span>
                  </div>
                )}
                {result?.insights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
                {result && result.commands.length > 0 && (
                  <div className="border rounded-md p-3 space-y-1.5">
                    <span className="text-xs font-medium">Commands Used</span>
                    <div className="flex flex-wrap gap-1">
                      {result.commands.slice(0, 40).map((cmd) => (
                        <Badge key={cmd.command} variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                          {cmd.command}
                          {cmd.count > 1 && <span className="ml-1 opacity-50">×{cmd.count}</span>}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {result && result.urls.length > 0 && (
                  <div className="border rounded-md p-3 space-y-1.5">
                    <span className="text-xs font-medium">URLs Found</span>
                    {result.urls.map((url) => (
                      <code key={url} className="block text-[11px] font-mono text-blue-500 truncate">{url}</code>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </section>
      </main>
    </div>
  );
}
