import { Activity, AlertCircle, Clock, Eye, FileText, Globe, Layers, ShieldOff, Timer } from 'lucide-react';
import { formatDuration } from '../lib/crawl-data';
import type { CrawlOverview } from '../types';

interface CrawlOverviewPanelProps {
  overview: CrawlOverview;
}

const metricIcons: Record<string, typeof Activity> = {
  Status: Activity,
  Visited: Eye,
  Discovered: Globe,
  Queued: Clock,
  Depth: Layers,
  Errors: AlertCircle,
  Blocked: ShieldOff,
  Forms: FileText,
  Duration: Timer,
};

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
        <div className="text-sm font-medium">Automation Overview</div>
        <div className="text-xs text-muted-foreground">Real-time crawl metrics.</div>
      </div>

      <div className="grid content-start gap-y-2 overflow-auto p-3 text-xs text-muted-foreground">
        {metrics.map((metric) => {
          const Icon = metricIcons[metric.label] ?? Activity;
          return (
            <div key={metric.label} className="grid grid-cols-[1fr_auto] gap-3">
              <span className="inline-flex items-center gap-1.5">
                <Icon className="size-3.5 shrink-0" />
                {metric.label}
              </span>
              <span className="font-semibold capitalize text-foreground">{metric.value}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
