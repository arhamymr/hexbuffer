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
    <span className={`text-xs px-1 py-0.5 rounded font-mono text-white ${colorClass}`}>
      {status}
    </span>
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
    <span className={`text-xs px-1 py-0.5 rounded font-mono text-white ${colorClass}`}>
      {level}
    </span>
  );
}

export function getActivityStatusColor(status: StatusActivityValue) {
  if (status === statusActivity.session) return 'bg-yellow-600';
  if (status === statusActivity.navigation) return 'bg-green-600';
  if (status === statusActivity.extraction) return 'bg-blue-600';
  if (status === statusActivity.ai) return 'bg-purple-600';
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
    <span className={`text-xs px-1 py-0.5 rounded font-mono text-white ${colorClass}`}>
      {sev}
    </span>
  );
}

export function ActivityStatusBadge({ status }: { status: StatusActivityValue }) {
  const colorClass = getActivityStatusColor(status);
  return (
    <span className={`text-xs px-1 py-0.5 rounded font-mono text-white ${colorClass}`}>
      {status}
    </span>
  );
}

export function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-green-600',
    POST: 'bg-blue-600',
    PUT: 'bg-orange-600',
    DELETE: 'bg-red-600',
    PATCH: 'bg-purple-600',
    HEAD: 'bg-gray-600',
    OPTIONS: 'bg-teal-600',
    CONNECT: 'bg-indigo-600',
    TRACE: 'bg-cyan-600',
  };
  return (
    <span className={`text-xs px-1 py-0.5 rounded font-mono text-white ${colors[method.toUpperCase()] || 'bg-gray-600'}`}>
      {method.toUpperCase()}
    </span>
  );
}
