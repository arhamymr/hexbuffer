'use client';

import { CheckCircle2, Download, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { INSIGHT_SEVERITIES } from '../constants';
import { formatTime } from '../lib/crawl-data';
import type { AIInsight, InsightSeverity } from '../types';

type SeverityFilter = InsightSeverity | 'all';

interface AiInsightsPanelProps {
  insights: AIInsight[];
  insightTypes: string[];
  severityFilter: SeverityFilter;
  typeFilter: string;
  onSeverityFilterChange: (value: SeverityFilter) => void;
  onTypeFilterChange: (value: string) => void;
  onOpenInsight: (insight: AIInsight) => void;
  onToggleReviewed: (insightId: string) => void;
  onExport: () => void;
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
  insightTypes,
  severityFilter,
  typeFilter,
  onSeverityFilterChange,
  onTypeFilterChange,
  onOpenInsight,
  onToggleReviewed,
  onExport,
}: AiInsightsPanelProps) {
  return (
    <section className="flex min-h-0 flex-col bg-background">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            AI Insights
          </div>
          <div className="text-xs text-muted-foreground">Recon observations from crawl evidence.</div>
        </div>
        <div className='flex gap-2'>
 <Select value={severityFilter} onValueChange={(value) => onSeverityFilterChange(value as SeverityFilter)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            {INSIGHT_SEVERITIES.map((severity) => (
              <SelectItem key={severity} value={severity}>
                {severity[0].toUpperCase() + severity.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {insightTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
        
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
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
                  onClick={() => onOpenInsight(insight)}
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
                  <Button variant="ghost" onClick={() => onToggleReviewed(insight.id)}>
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
