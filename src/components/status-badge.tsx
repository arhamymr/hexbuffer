import { CONSOLE_LEVEL_COLORS } from '@/pages/inspector/constants';
import { Badge } from '@/components/ui/badge';
import { getMethodBadgeColor } from '@/lib/method-colors';
import { cn } from '@/lib/utils';

export const levelBadge = {
  info: 'info',
  warning: 'warning',
  error: 'error',
} as const;

export const statusActivity = {
  session: 'session',
  navigation: 'navigation',
  extraction: 'extraction',
  ai: 'ai',
  human: 'human',
  policy: 'policy',
  error: 'error',
  queue: 'queue',
} as const;

export type LevelBadgeValue = (typeof levelBadge)[keyof typeof levelBadge];
export type StatusActivityValue = (typeof statusActivity)[keyof typeof statusActivity];
export type StatusBadgeValue = number | null | undefined;

export function getStatusColor(status: StatusBadgeValue) {
  if (!status) return 'bg-gray-500';
  if (status >= 200 && status < 300) return 'bg-green-600';
  if (status >= 300 && status < 400) return 'bg-blue-600';
  if (status >= 400 && status < 500) return 'bg-orange-600';
  if (status >= 500) return 'bg-red-600';
  return 'bg-gray-600';
}

export function StatusBadge({ status }: { status: StatusBadgeValue }) {
  if (status === null || status === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }
  const colorClass = getStatusColor(status);
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] px-1 py-0.5 rounded font-mono shadow-none border-none text-white font-semibold',
        colorClass
      )}
    >
      {status}
    </Badge>
  );
}

export function getLevelColor(level: LevelBadgeValue) {
  if (level === levelBadge.info) return 'bg-blue-600';
  if (level === levelBadge.warning) return 'bg-orange-600';
  if (level === levelBadge.error) return 'bg-red-600';
  return 'bg-gray-600';
}

export function LevelBadge({ level }: { level: LevelBadgeValue }) {
  const colorClass = getLevelColor(level);
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] px-1 py-0.5 rounded font-mono shadow-none border-none text-white font-semibold',
        colorClass
      )}
    >
      {level}
    </Badge>
  );
}

export function getActivityStatusColor(status: StatusActivityValue) {
  if (status === statusActivity.session) return 'bg-yellow-600';
  if (status === statusActivity.navigation) return 'bg-green-600';
  if (status === statusActivity.extraction) return 'bg-blue-600';
  if (status === statusActivity.ai) return 'bg-purple-600';
  if (status === statusActivity.human) return 'bg-cyan-600';
  if (status === statusActivity.policy) return 'bg-red-600';
  if (status === statusActivity.error) return 'bg-red-600';
  if (status === statusActivity.queue) return 'bg-gray-600';
  return 'bg-gray-600';
}
export const severity = {
  info: 'info',
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
} as const;

export type SeverityBadgeValue = (typeof severity)[keyof typeof severity];

export function getSeverityColor(sev: SeverityBadgeValue) {
  if (sev === severity.info) return 'bg-blue-600';
  if (sev === severity.low) return 'bg-green-600';
  if (sev === severity.medium) return 'bg-yellow-600';
  if (sev === severity.high) return 'bg-orange-600';
  if (sev === severity.critical) return 'bg-red-600';
  return 'bg-gray-600';
}

export function SeverityBadge({ severity: sev }: { severity: SeverityBadgeValue }) {
  const colorClass = getSeverityColor(sev);
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] px-1 py-0.5 rounded font-mono shadow-none border-none text-white font-semibold',
        colorClass
      )}
    >
      {sev}
    </Badge>
  );
}

export function InterestingBadge() {
  return (
    <Badge
      variant="outline"
      className="text-[10px] px-1 py-0.5 rounded font-mono shadow-none border-none text-white font-semibold bg-yellow-600"
    >
      Interesting
    </Badge>
  );
}

export type ConsoleLevelValue = 'log' | 'info' | 'warning' | 'error' | 'debug' | 'pageerror';

export function ConsoleLevelBadge({ level }: { level: ConsoleLevelValue }) {
  const colorClass = CONSOLE_LEVEL_COLORS[level] ?? 'bg-gray-600';
  const label = level === 'pageerror' ? 'error' : level;
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] px-1 py-0.5 rounded font-mono shadow-none border-none text-white font-semibold',
        colorClass
      )}
    >
      {label}
    </Badge>
  );
}

export function ActivityStatusBadge({ status }: { status: StatusActivityValue }) {
  const colorClass = getActivityStatusColor(status);
  return (
    <Badge
      // variant="outline"
      className={cn(
        'text-[10px] px-1 py-0.5 rounded font-mono shadow-none border-none text-white font-semibold',
        colorClass
      )}
    >
      {status}
    </Badge>
  );
}

export function MethodBadge({ method, className }: { method: string; className?: string }) {
  return (
    <Badge
      // variant="outline"
      className={cn(
        'text-[10px] px-1 py-0.5 rounded font-mono shadow-none border shrink-0 font-semibold uppercase',
        getMethodBadgeColor(method),
        className
      )}
    >
      {method.toUpperCase()}
    </Badge>
  );
}

export const crawlStatus = {
  idle: 'idle',
  running: 'running',
  paused: 'paused',
  completed: 'completed',
  failed: 'failed',
  stopped: 'stopped',
} as const;

export type CrawlStatusValue = (typeof crawlStatus)[keyof typeof crawlStatus];

export function getCrawlStatusColor(status: CrawlStatusValue) {
  if (status === crawlStatus.running) return 'bg-emerald-600';
  if (status === crawlStatus.paused) return 'bg-amber-600';
  if (status === crawlStatus.completed) return 'bg-sky-600';
  if (status === crawlStatus.failed) return 'bg-red-600';
  if (status === crawlStatus.stopped) return 'bg-gray-500';
  if (status === crawlStatus.idle) return 'bg-gray-500';
  return 'bg-gray-500';
}

export function CrawlStatusBadge({ status }: { status: CrawlStatusValue }) {
  const colorClass = getCrawlStatusColor(status);
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] px-1 py-0.5 rounded font-mono shadow-none border-none text-white font-semibold',
        colorClass
      )}
    >
      {status}
    </Badge>
  );
}
