import { formatDuration } from '../lib/crawl-data';
import type { CrawlOverview } from '../types';

interface CrawlOverviewPanelProps {
  overview: CrawlOverview;
}

export function CrawlOverviewPanel({ overview }: CrawlOverviewPanelProps) {
  const metrics = [
    { label: 'Status', value: overview.sessionStatus },
    { label: 'Visited', value: overview.pagesVisited },
    { label: 'Discovered', value: overview.urlsDiscovered },
    { label: 'Queued', value: overview.urlsQueued },
    { label: 'Depth', value: overview.currentDepth },
    { label: 'Errors', value: overview.errors },
    { label: 'Blocked', value: overview.blockedPages },
    { label: 'Forms', value: overview.formsFound },
    { label: 'Duration', value: formatDuration(overview.durationSeconds) },
  ];

  return (
    <section className="flex min-h-0 flex-col border-b bg-background xl:border-b-0">
      <div className="border-b px-3 py-2">
        <div className="text-sm font-medium">Crawl Overview</div>
        <div className="text-xs text-muted-foreground">Real-time crawl metrics.</div>
      </div>

      <div className="grid content-start gap-y-2 overflow-auto p-3 text-xs text-muted-foreground">
        {metrics.map((metric) => (
          <div key={metric.label} className="grid grid-cols-[1fr_auto] gap-3">
            <span>{metric.label}</span>
            <span className="font-semibold capitalize text-foreground">{metric.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
