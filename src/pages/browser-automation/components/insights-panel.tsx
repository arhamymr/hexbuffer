'use client';

import { CheckCircle2, ScanEye, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { formatTime } from '../lib/crawl-data';
import type { AIInsight, CrawlPage, InsightSeverity } from '../types';

interface AiInsightsPanelProps {
  insights: AIInsight[];
  interestingPages: CrawlPage[];
  analyzingPageIds: Set<string>;
}

const severityStyles: Record<InsightSeverity, string> = {
  info: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  low: 'border-lime-500/25 bg-lime-500/10 text-lime-700 dark:text-lime-300',
  medium: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  high: 'border-orange-500/25 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  critical: 'border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300',
};

export function AiInsightsPanel({
  insights,
  interestingPages,
  analyzingPageIds,
}: AiInsightsPanelProps) {
  const selectPage = useBrowserAutomationStore((s) => s.selectPage);
  const toggleInsightReviewed = useBrowserAutomationStore((s) => s.toggleInsightReviewed);
  const analyzePageWithAi = useBrowserAutomationStore((s) => s.analyzePageWithAi);
  const pages = useBrowserAutomationStore((s) => s.pages);

  function handleInsightOpen(insight: AIInsight) {
    if (insight.pageId) {
      selectPage(insight.pageId);
      return;
    }
    const page = pages.find((item) => item.url === insight.url);
    selectPage(page?.id ?? null);
  }

  return (
    <section className="flex min-h-0 flex-col bg-background">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            Insights
          </div>
          <div className="text-xs text-muted-foreground">Recon observations from crawl evidence.</div>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {interestingPages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <ScanEye className="size-3.5" />
                Interesting Pages ({interestingPages.length})
              </div>
              {interestingPages.map((page) => {
                const isAnalyzing = analyzingPageIds.has(page.id);
                const hasAiSummary = !!page.aiSummary?.trim();
                return (
                  <div
                    key={page.id}
                    className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {page.title || page.url}
                        </div>
                        <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                          {page.url}
                        </div>
                        {hasAiSummary && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {page.aiSummary}
                          </p>
                        )}
                      </div>
                      <Button
                        size="xs"
                        variant={hasAiSummary ? 'secondary' : 'outline'}
                        disabled={isAnalyzing}
                        onClick={() => analyzePageWithAi(page)}
                      >
                        <Sparkles className="size-3.5" />
                        {isAnalyzing ? 'Analyzing...' : hasAiSummary ? 'Re-analyze' : 'Analyze'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {interestingPages.length > 0 && insights.length > 0 && (
            <div className="border-t pt-2">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                All Insights
              </div>
            </div>
          )}

          {insights.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No insights match the current filters.
            </div>
          ) : (
            insights.map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  'rounded-md border bg-background p-3 transition-colors hover:bg-muted/50',
                  insight.reviewed && 'opacity-65'
                )}
              >
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => handleInsightOpen(insight)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn('capitalize', severityStyles[insight.severity])}>
                      {insight.severity}
                    </Badge>
                    <Badge variant="outline">{insight.type}</Badge>
                    {insight.reviewed && (
                      <Badge variant="outline" className="border-emerald-500/25 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Reviewed
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 text-sm font-medium">{insight.title}</div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {insight.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatTime(insight.createdAt)}</span>
                    {insight.url && <span className="truncate font-mono">{insight.url}</span>}
                  </div>
                </button>

                <div className="mt-2 flex justify-end">
                  <Button variant="ghost" onClick={() => toggleInsightReviewed(insight.id)}>
                    <CheckCircle2 className="h-4 w-4" />
                    {insight.reviewed ? 'Unreview' : 'Review'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </section>
  );
}
