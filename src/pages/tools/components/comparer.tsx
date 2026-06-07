'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight, Copy, Trash2 } from 'lucide-react';
import { diffLines, diffWords, diffChars, type Change } from 'diff';

type DiffMode = 'lines' | 'words' | 'chars';

const diffFunctions: Record<DiffMode, (a: string, b: string) => Change[]> = {
  lines: (a, b) => diffLines(a, b, { ignoreNewlineAtEof: true }),
  words: (a, b) => diffWords(a, b),
  chars: (a, b) => diffChars(a, b),
};

const modeLabels: Record<DiffMode, string> = {
  lines: 'Lines',
  words: 'Words',
  chars: 'Chars',
};

function buildUnifiedText(parts: Change[]): string {
  return parts
    .map((p) => {
      if (p.added) return p.value.split('\n').map((l) => `+ ${l}`).join('\n');
      if (p.removed) return p.value.split('\n').map((l) => `- ${l}`).join('\n');
      return p.value.split('\n').map((l) => `  ${l}`).join('\n');
    })
    .join('');
}

export function ComparerTool() {
  const [valueA, setValueA] = React.useState('');
  const [valueB, setValueB] = React.useState('');
  const [diffMode, setDiffMode] = React.useState<DiffMode>('lines');
  const diffResult = React.useMemo<Change[]>(() => {
    if (!valueA && !valueB) return [];
    return diffFunctions[diffMode](valueA, valueB);
  }, [valueA, valueB, diffMode]);

  const hasContent = valueA.length > 0 || valueB.length > 0;
  const hasDiff = diffResult.some((p) => p.added || p.removed);

  const handleCopy = async () => {
    const text = buildUnifiedText(diffResult);
    if (text) {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleClear = () => {
    setValueA('');
    setValueB('');
  };

  const handleSwap = () => {
    setValueA(valueB);
    setValueB(valueA);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="bg-muted px-3 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={diffMode} onValueChange={(v) => setDiffMode(v as DiffMode)}>
              <TabsList className="grid grid-cols-3 bg-background">
                <TabsTrigger value="lines">Lines</TabsTrigger>
                <TabsTrigger value="words">Words</TabsTrigger>
                <TabsTrigger value="chars">Chars</TabsTrigger>
              </TabsList>
            </Tabs>
            <Badge variant="outline" className="font-normal">
              Compare by {modeLabels[diffMode].toLowerCase()}
              {hasDiff && (
                <span className="ml-1.5 text-amber-500">
                  ({diffResult.filter((p) => p.added || p.removed).length} changes)
                </span>
              )}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleSwap} disabled={!hasContent}>
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Swap
            </Button>
            <Button variant="outline" onClick={handleCopy} disabled={diffResult.length === 0}>
              <Copy className="h-3.5 w-3.5" />
              Copy diff
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={handleClear} disabled={!hasContent}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 border-t">
        {/* Input panels */}
        <section className="grid h-[45%] min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col border-b bg-background lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
              <div>
                <Label className="text-sm font-medium">Value A</Label>
                <div className="text-xs text-muted-foreground">Original / left-hand value.</div>
              </div>
            </div>
            <Textarea
              className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-sm shadow-none focus-visible:ring-0"
              placeholder="Enter first value…"
              value={valueA}
              onChange={(e) => setValueA(e.target.value)}
            />
          </div>

          <div className="flex min-h-0 flex-col bg-background">
            <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
              <div>
                <Label className="text-sm font-medium">Value B</Label>
                <div className="text-xs text-muted-foreground">Modified / right-hand value.</div>
              </div>
            </div>
            <Textarea
              className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-sm shadow-none focus-visible:ring-0"
              placeholder="Enter second value…"
              value={valueB}
              onChange={(e) => setValueB(e.target.value)}
            />
          </div>
        </section>

        {/* Diff output */}
        <section className="flex min-h-0 flex-1 flex-col border-t">
          <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
            <div>
              <Label className="text-sm font-medium">Diff</Label>
              <div className="text-xs text-muted-foreground">
                Unified diff output updates automatically.
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={handleCopy} disabled={diffResult.length === 0}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-background p-0">
            {diffResult.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {hasContent ? 'Values are identical.' : 'Enter two values to compare.'}
              </div>
            ) : (
              <pre className="h-full font-mono text-sm leading-relaxed whitespace-pre-wrap break-all p-4">
                {diffResult.map((part, i) => {
                  if (part.added) {
                    return (
                      <span
                        key={i}
                        className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      >
                        {part.value}
                      </span>
                    );
                  }
                  if (part.removed) {
                    return (
                      <span
                        key={i}
                        className="bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                      >
                        {part.value}
                      </span>
                    );
                  }
                  return <span key={i}>{part.value}</span>;
                })}
              </pre>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
