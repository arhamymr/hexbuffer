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
      <div className="flex h-10 shrink-0 items-center justify-between border-b bg-muted/40 px-3 gap-2">
        <div className="flex items-center gap-2">
          <Tabs value={diffMode} onValueChange={(v) => setDiffMode(v as DiffMode)}>
            <TabsList className="h-7 bg-background p-0.5 border">
              <TabsTrigger value="lines" className="h-6 text-xs px-2.5">Lines</TabsTrigger>
              <TabsTrigger value="words" className="h-6 text-xs px-2.5">Words</TabsTrigger>
              <TabsTrigger value="chars" className="h-6 text-xs px-2.5">Chars</TabsTrigger>
            </TabsList>
          </Tabs>
          <Badge variant="outline" className="font-normal text-[10px] py-px h-5 hidden md:inline-flex">
            Compare by {modeLabels[diffMode].toLowerCase()}
            {hasDiff && (
              <span className="ml-1.5 text-amber-500 font-medium">
                ({diffResult.filter((p) => p.added || p.removed).length} changes)
              </span>
            )}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handleSwap} disabled={!hasContent} className="h-7 text-xs gap-1 px-2">
            <ArrowLeftRight className="h-3 w-3" />
            Swap
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} disabled={diffResult.length === 0} className="h-7 text-xs gap-1 px-2">
            <Copy className="h-3 w-3" />
            Copy Diff
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClear} disabled={!hasContent} className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <main className="min-h-0 flex-1 flex flex-col">
        {/* Input panels */}
        <section className="grid h-[45%] min-h-0 grid-cols-1 lg:grid-cols-2">
          <div className="flex min-h-0 flex-col border-b bg-background lg:border-b-0 lg:border-r">
            <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Value A</span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">Original / left-hand value</span>
              </div>
            </div>
            <Textarea
              className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3"
              placeholder="Enter first value…"
              value={valueA}
              onChange={(e) => setValueA(e.target.value)}
            />
          </div>

          <div className="flex min-h-0 flex-col bg-background">
            <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Value B</span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">Modified / right-hand value</span>
              </div>
            </div>
            <Textarea
              className="min-h-0 flex-1 resize-none rounded-none border-0 font-mono text-xs shadow-none focus-visible:ring-0 bg-transparent p-3"
              placeholder="Enter second value…"
              value={valueB}
              onChange={(e) => setValueB(e.target.value)}
            />
          </div>
        </section>

        {/* Diff output */}
        <section className="flex min-h-0 flex-1 flex-col border-t">
          <div className="flex h-8 shrink-0 items-center justify-between border-b bg-muted/10 px-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider">Diff Output</span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">Unified diff updates automatically</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleCopy} disabled={diffResult.length === 0} className="h-6 w-6 text-muted-foreground hover:text-foreground">
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-background p-0">
            {diffResult.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                {hasContent ? 'Values are identical.' : 'Enter two values to compare.'}
              </div>
            ) : (
              <pre className="h-full font-mono text-xs leading-relaxed whitespace-pre-wrap break-all p-4">
                {diffResult.map((part, i) => {
                  if (part.added) {
                    return (
                      <span
                        key={i}
                        className="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      >
                        {part.value}
                      </span>
                    );
                  }
                  if (part.removed) {
                    return (
                      <span
                        key={i}
                        className="bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400"
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
