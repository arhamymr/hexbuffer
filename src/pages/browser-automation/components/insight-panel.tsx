'use client';

import { CheckCircle2, ScanEye, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { SeverityBadge } from '@/components/status-badge';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { formatTime } from '../lib/crawl-data';
import type { AIInsight, CrawlPage } from '../types';

interface AiInsightsPanelProps {
  insights: AIInsight[];
  interestingPages: CrawlPage[];
  analyzingPageIds: Set<string>;
}

export function AiInsightsPanel({
  insights,
  interestingPages,
  analyzingPageIds,
}: AiInsightsPanelProps) {
  const selectPage = useBrowserAutomationStore((s) => s.selectPage);
  const toggleInsightReviewed = useBrowserAutomationStore((s) => s.toggleInsightReviewed);
  const analyzePageWithAi = useBrowserAutomationStore((s) => s.analyzePageWithAi);
  const pages = useBrowserAutomationStore((s) => s.getActiveTab()?.pages ?? []);

  function handleInsightOpen(insight: AIInsight) {
    if (insight.pageId) {
      selectPage(insight.pageId);
      return;
    }
    const page = pages.find((item) => item.url === insight.url);
    selectPage(page?.id ?? null);
  }

  return (
    <section className="flex min-h-0 flex-col overflow-hidden bg-background">
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
                    className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 min-w-0"
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
                  'rounded-md border bg-background p-2 transition-colors hover:bg-muted/50 min-w-0',
                  insight.reviewed && 'opacity-65'
                )}
              >
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => handleInsightOpen(insight)}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SeverityBadge severity={insight.severity} />
                    {insight.aiUsedForAnalysis && (
                      <span className={`text-xs px-1 py-0.5 rounded font-mono text-white bg-purple-500  `}>
                        AI
                      </span>
                    )}
                    <span className={`text-xs px-1 py-0.5 rounded font-mono text-muted-foreground border border-gray-500  `}>
                      {insight.type}
                    </span>
                    {insight.reviewed && (
                      <Badge variant="outline" className="h-5 border-emerald-500/25 px-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Reviewed
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1.5 text-xs font-medium leading-4 truncate">{insight.title}</div>
                  <p className="mt-0.5 line-clamp-3 break-words text-xs leading-4 text-muted-foreground">
                    {insight.description}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="font-mono">{formatTime(insight.createdAt)}</span>
                    {insight.url && <span className="truncate font-mono">{insight.url}</span>}
                  </div>
                </button>

                <div className="mt-1 flex">
                  <Button
                    size="xs"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={() => toggleInsightReviewed(insight.id)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
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
