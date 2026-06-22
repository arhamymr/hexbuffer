import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { CheckCircle2, ScanEye, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HighlightedText } from '@/components/highlighted-text';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SeverityBadge } from '@/components/status-badge';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { useToolsStore } from '@/stores/tools';
import { formatTime } from '../lib/crawl-data';
import type { AIInsight, CrawlPage, InsightSeverity } from '../types';

type SeverityFilter = 'all' | InsightSeverity;
type DetailItem =
  | { type: 'page'; page: CrawlPage }
  | { type: 'insight'; insight: AIInsight };

const SEVERITY_ORDER: InsightSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
const SEVERITY_RANK = SEVERITY_ORDER.reduce<Record<InsightSeverity, number>>((acc, severity, index) => {
  acc[severity] = index;
  return acc;
}, {} as Record<InsightSeverity, number>);

function normalizePageUrl(value?: string) {
  if (!value) return '';

  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.trim().replace(/\/$/, '');
  }
}

function getInsightSourceLabel(insight: AIInsight) {
  if (insight.analysisSource === 'ai') return 'AI';
  if (insight.analysisSource === 'default') return insight.analysisToolName?.trim() || 'Heuristic';
  if (insight.analysisSource === 'manual') return insight.analysisToolName?.trim() || 'Manual';
  if (insight.aiUsedForAnalysis) return 'AI';
  return null;
}

function InsightSourceBadge({ insight }: { insight: AIInsight }) {
  const label = getInsightSourceLabel(insight);
  if (!label) return null;

  const isAi = insight.analysisSource === 'ai' || (!insight.analysisSource && insight.aiUsedForAnalysis);

  return (
    <span
      className={cn(
        'max-w-full shrink-0 break-words rounded px-1 py-0.5 font-mono text-xs',
        isAi
          ? 'bg-purple-500 text-white'
          : 'border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
      )}
    >
      {label}
    </span>
  );
}

interface AiInsightsPanelProps {
  insights: AIInsight[];
  interestingPages: CrawlPage[];
  searchQuery?: string;
}

export function AiInsightsPanel({
  insights,
  interestingPages,
  searchQuery = '',
}: AiInsightsPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null);
  const selectPage = useBrowserAutomationStore((s) => s.selectPage);
  const toggleInsightReviewed = useBrowserAutomationStore((s) => s.toggleInsightReviewed);
  const pages = useBrowserAutomationStore((s) => s.getActiveTab()?.pages ?? []);
  const navigate = useNavigate();
  const sendToScriptAnalyzer = useToolsStore((s) => s.sendToScriptAnalyzer);

  const visibleInsights = useMemo(() => {
    return [...insights]
      .filter((insight) => severityFilter === 'all' || insight.severity === severityFilter)
      .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  }, [insights, severityFilter]);

  function findPageForInsight(insight: AIInsight) {
    const pageById = insight.pageId
      ? pages.find((item) => item.id === insight.pageId)
      : null;

    if (pageById) return pageById;

    const insightUrl = normalizePageUrl(insight.url);
    if (!insightUrl) return null;

    return pages.find((item) => normalizePageUrl(item.url) === insightUrl) ?? null;
  }

  function getDetailPage() {
    if (!detailItem) return null;
    return detailItem.type === 'page' ? detailItem.page : findPageForInsight(detailItem.insight);
  }

  function handleDetailOpenPage() {
    const page = getDetailPage();
    if (!page) return;

    selectPage(page.id);
    setDetailItem(null);
  }

  function handleSendToScriptAnalyzer() {
    if (!detailItem || detailItem.type !== 'insight') return;
    const insight = detailItem.insight;
    const lines = [
      `# Insight: ${insight.title}`,
      `# Severity: ${insight.severity}`,
      `# Type: ${insight.type}`,
      `# Source: ${getInsightSourceLabel(insight) || 'unknown'}`,
      insight.url ? `# URL: ${insight.url}` : '',
      '',
      insight.description,
    ].filter(Boolean).join('\n');
    sendToScriptAnalyzer(lines);
    navigate('/tools');
    toast.success('Sent to Script Analyzer');
    setDetailItem(null);
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>, item: DetailItem) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setDetailItem(item);
  }

  const detailPage = getDetailPage();

  return (
    <section className="flex h-full flex-col overflow-hidden bg-background">
      <div className="sticky top-0 z-10 shrink-0 border-b bg-background px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs font-medium">
              Insights
            </div>
            <div className="break-words text-xs text-muted-foreground">Recon observations from crawl evidence.</div>
          </div>
          <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as SeverityFilter)}>
            <SelectTrigger className="h-7 max-w-full basis-32 text-xs">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              {SEVERITY_ORDER.map((severity) => (
                <SelectItem key={severity} value={severity}>
                  {severity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3">
        <div className="max-w-full space-y-2 py-3">
          <Accordion
            type="multiple"
            defaultValue={['interesting-pages', 'all-insights']}
            className="max-w-full space-y-2 overflow-hidden"
          >
            {interestingPages.length > 0 && (
              <AccordionItem value="interesting-pages" className="max-w-full overflow-hidden rounded-md border">
                <AccordionTrigger className="w-full max-w-full gap-2 overflow-hidden px-2 py-2 text-xs font-semibold uppercase text-muted-foreground hover:bg-muted/50 hover:no-underline">
                  <span className="flex max-w-full flex-1 items-center gap-2 overflow-hidden">
                    <ScanEye className="size-3.5 shrink-0" />
                    <span className="max-w-full break-words">Interesting Pages ({interestingPages.length})</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="max-w-full space-y-2 overflow-hidden px-2 pb-2">
                  {interestingPages.map((page) => {
                    const hasAiSummary = !!page.aiSummary?.trim();
                    return (
                      <div
                        key={page.id}
                        role="button"
                        tabIndex={0}
                        className="max-w-full cursor-pointer rounded-md border border-amber-500/20 bg-amber-500/5 p-1 text-left transition-colors hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setDetailItem({ type: 'page', page })}
                        onKeyDown={(event) => handleCardKeyDown(event, { type: 'page', page })}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="break-words text-xs font-medium">
                              <HighlightedText text={page.title || page.url} query={searchQuery} />
                            </div>
                            <div className="mt-0.5 !break-all font-mono text-xs text-muted-foreground">
                              <HighlightedText text={page.url} query={searchQuery} />
                            </div>
                            {hasAiSummary && (
                              <p className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">
                                <HighlightedText text={page.aiSummary || ''} query={searchQuery} />
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            )}

            <AccordionItem value="all-insights" className="max-w-full overflow-hidden rounded-md border">
              <AccordionTrigger className="w-full max-w-full gap-2 overflow-hidden px-2 py-2 text-xs font-semibold uppercase text-muted-foreground hover:bg-muted/50 hover:no-underline">
                <span className="max-w-full flex-1 break-words">All Insights ({visibleInsights.length})</span>
              </AccordionTrigger>
              <AccordionContent className="max-w-full space-y-2 overflow-hidden px-2 pb-2">
                {visibleInsights.length === 0 ? (
                  <div className="max-w-full rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No insights match the current filters.
                  </div>
                ) : (
                  visibleInsights.map((insight) => (
                    <div
                      key={insight.id}
                      role="button"
                      tabIndex={0}
                      className={cn(' max-w-full cursor-pointer rounded-md border bg-background p-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        insight.reviewed && 'opacity-65'
                      )}
                      onClick={() => setDetailItem({ type: 'insight', insight })}
                      onKeyDown={(event) => handleCardKeyDown(event, { type: 'insight', insight })}
                    >
                      <div className="flex max-w-full flex-wrap items-center gap-1.5">
                        <SeverityBadge severity={insight.severity} />
                        <InsightSourceBadge insight={insight} />
                        <span className="max-w-full break-all rounded border border-gray-500 px-1 py-0.5 font-mono text-xs text-muted-foreground">
                          <HighlightedText text={insight.type} query={searchQuery} />
                        </span>
                        {insight.reviewed && (
                          <Badge variant="outline" className="h-5 shrink-0 border-emerald-500/25 px-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            Reviewed
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1.5 break-words text-xs font-medium leading-4">
                        <HighlightedText text={insight.title} query={searchQuery} />
                      </div>
                      <p className="mt-0.5 line-clamp-3 break-words text-xs leading-4 text-muted-foreground">
                        <HighlightedText text={insight.description} query={searchQuery} />
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                        <span className="shrink-0 font-mono">{formatTime(insight.createdAt)}</span>
                        {insight.url && (
                          <span className="max-w-full break-all font-mono">
                            <HighlightedText text={insight.url} query={searchQuery} />
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap">
                        <Button
                          size="xs"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onKeyDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleInsightReviewed(insight.id);
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {insight.reviewed ? 'Unreview' : 'Review'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>

      <Dialog open={detailItem !== null} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-[720px]">
          <DialogHeader className="">
            <DialogTitle className="break-words pr-6 text-base">
              <HighlightedText
                text={
                  detailItem?.type === 'page'
                    ? detailItem.page.title || detailItem.page.url
                    : detailItem?.insight.title || ''
                }
                query={searchQuery}
              />
            </DialogTitle>
            <DialogDescription className="max-w-full break-all font-mono text-xs">
              <HighlightedText
                text={detailItem?.type === 'page' ? detailItem.page.url : detailItem?.insight.url || detailPage?.url || ''}
                query={searchQuery}
              />
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-w-full max-h-[56vh] rounded-md border">
            <div className="max-w-full space-y-3 p-3 text-sm">
              {detailItem?.type === 'page' ? (
                <>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">AI Summary</div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    <HighlightedText
                      text={detailItem.page.aiSummary?.trim() || 'No summary available.'}
                      query={searchQuery}
                    />
                  </p>
                </>
              ) : detailItem?.type === 'insight' ? (
                <>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SeverityBadge severity={detailItem.insight.severity} />
                    <InsightSourceBadge insight={detailItem.insight} />
                    <span className="max-w-full break-all rounded border border-gray-500 px-1 py-0.5 font-mono text-xs text-muted-foreground">
                      <HighlightedText text={detailItem.insight.type} query={searchQuery} />
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {formatTime(detailItem.insight.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Description</div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    <HighlightedText text={detailItem.insight.description} query={searchQuery} />
                  </p>
                </>
              ) : null}
            </div>
          </ScrollArea>

          <DialogFooter>
            {detailItem?.type === 'insight' && (
              <Button variant="outline" onClick={handleSendToScriptAnalyzer}>
                <Send className="h-3.5 w-3.5" />
                Script Analyzer
              </Button>
            )}
            <Button variant="outline" onClick={handleDetailOpenPage} disabled={!detailPage}>
              Open Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
