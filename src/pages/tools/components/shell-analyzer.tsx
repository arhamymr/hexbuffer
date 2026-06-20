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
  critical: { color: 'text-red-500 border-red-500/20 bg-red-500/5', icon: AlertTriangle },
  high: { color: 'text-orange-500 border-orange-500/20 bg-orange-500/5', icon: Shield },
  medium: { color: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5', icon: AlertTriangle },
  low: { color: 'text-blue-500 border-blue-500/20 bg-blue-500/5', icon: Info },
  info: { color: 'text-muted-foreground border-border bg-muted/50', icon: Info },
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
    <div className={`border rounded-md px-2.5 py-1.5 text-xs ${config.color}`}>
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
        <span className="font-medium truncate">{insight.title}</span>
        <Badge variant="outline" className="ml-auto shrink-0 text-[9px] px-1 py-0 h-3.5 uppercase font-medium">
          {insight.severity}
        </Badge>
      </button>
      {expanded && (
        <div className="mt-2 pl-5 space-y-1.5 text-[11px] leading-relaxed">
          <p className="opacity-80">{insight.description}</p>
          {insight.evidence.length > 0 && (
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase tracking-wider opacity-50 font-semibold">Evidence</span>
              {insight.evidence.map((ev, i) => (
                <code key={i} className="block font-mono text-[10px] truncate opacity-70 bg-muted/40 px-1 rounded">{ev}</code>
              ))}
            </div>
          )}
          {insight.lineNumbers.length > 0 && (
            <span className="text-[10px] opacity-50 block">
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
    <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground border-b pb-2">
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
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono">{meta.shebang}</Badge>
        </>
      )}
      <div className="ml-auto flex items-center gap-1">
        {severityCounts.critical > 0 && (
          <Badge variant="outline" className="text-[9px] px-1 h-4 border-red-500/30 text-red-500">
            {severityCounts.critical} critical
          </Badge>
        )}
        {severityCounts.high > 0 && (
          <Badge variant="outline" className="text-[9px] px-1 h-4 border-orange-500/30 text-orange-500">
            {severityCounts.high} high
          </Badge>
        )}
        {severityCounts.medium > 0 && (
          <Badge variant="outline" className="text-[9px] px-1 h-4 border-yellow-500/30 text-yellow-500">
            {severityCounts.medium} medium
          </Badge>
        )}
        {severityCounts.low > 0 && (
          <Badge variant="outline" className="text-[9px] px-1 h-4 border-blue-500/30 text-blue-500">
            {severityCounts.low} low
          </Badge>
        )}
        {severityCounts.info > 0 && (
          <Badge variant="outline" className="text-[9px] px-1 h-4">
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
      <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/40 px-3 gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-normal text-[10px] py-px h-5">
            Script Analyzer
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handleCopyReport} disabled={!result?.insights.length} className="h-7 text-xs gap-1 px-2">
            <Copy className="h-3 w-3" />
            Copy Report
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClear} disabled={!input && !result} className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <main className="min-h-0 flex-1 flex flex-col">
        <section className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-2">
          {/* Left: Input */}
          <div className="flex min-h-0 flex-col border-b bg-background lg:border-b-0 lg:border-r">
            <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Script Input</span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">Paste shell script to analyze</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClear} disabled={!input} className="h-6 w-6 text-muted-foreground hover:text-foreground">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <Textarea
              className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3"
              placeholder={"#!/usr/bin/env bash\nset -euo pipefail\n\n# Paste your script here..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          {/* Right: Results */}
          <div className="flex min-h-0 flex-col bg-background">
            <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Analysis Results</span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  {result ? `${result.insights.length} finding(s)` : 'Paste a script to analyze'}
                </span>
              </div>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-3 space-y-3">
                {result && <StatsBar result={result} />}
                {result?.insights.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Shield className="h-8 w-8 mb-2 opacity-35" />
                    <span className="text-xs">No findings — script looks clean.</span>
                  </div>
                )}
                {result?.insights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
                {result && result.commands.length > 0 && (
                  <div className="border rounded-md p-2.5 space-y-1.5 text-xs bg-muted/5">
                    <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block">Commands Used</span>
                    <div className="flex flex-wrap gap-1">
                      {result.commands.slice(0, 40).map((cmd) => (
                        <Badge key={cmd.command} variant="outline" className="text-[9px] px-1.5 py-0 h-4.5 font-mono">
                          {cmd.command}
                          {cmd.count > 1 && <span className="ml-1 opacity-50">×{cmd.count}</span>}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {result && result.urls.length > 0 && (
                  <div className="border rounded-md p-2.5 space-y-1.5 text-xs bg-muted/5">
                    <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block">URLs Found</span>
                    <div className="space-y-1">
                      {result.urls.map((url) => (
                        <code key={url} className="block text-[10px] font-mono text-blue-500 truncate" title={url}>{url}</code>
                      ))}
                    </div>
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
