import { ShieldIcon, PulseIcon, ClockIcon, WifiHighIcon } from '@phosphor-icons/react';
import type { ListenerDashboardStats } from '../types';

interface ListenerMetricsProps {
  stats: ListenerDashboardStats;
  isEnabled: boolean;
}

export function ListenerMetrics({ stats, isEnabled }: ListenerMetricsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground font-mono shrink-0">
      {/* Connected Servers */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex h-2 w-2">
          {isEnabled ? (
            <>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </>
          ) : (
            <span className="relative inline-flex h-2 w-2 rounded-full bg-muted-foreground/40"></span>
          )}
        </div>
        <span className="font-semibold text-foreground">
          {isEnabled ? stats.connectedServers : 0}
        </span>
        <span>servers active</span>
      </div>

      <span className="text-border">|</span>

      {/* Active Payloads */}
      <div className="flex items-center gap-1">
        <ShieldIcon className="h-3.5 w-3.5" />
        <span className="font-semibold text-foreground">{stats.activePayloads}</span>
        <span>payloads</span>
      </div>

      <span className="text-border">|</span>

      {/* Interactions Today */}
      <div className="flex items-center gap-1.5">
        <PulseIcon className="h-3.5 w-3.5" />
        <span className="font-semibold text-foreground">{stats.interactionsToday}</span>
        <span>interactions today</span>
        <span className="text-[10px] text-muted-foreground/80">
          (DNS: {stats.dnsEvents} · HTTP: {stats.httpEvents} · HTTPS: {stats.httpsEvents})
        </span>
      </div>

      {stats.lastCallback && (
        <>
          <span className="text-border">|</span>
          {/* Last Callback */}
          <div className="flex items-center gap-1">
            <ClockIcon className="h-3.5 w-3.5" />
            <span>Last callback:</span>
            <span className="font-semibold text-foreground">{formatRelative(stats.lastCallback)}</span>
          </div>
        </>
      )}
    </div>
  );
}

function formatRelative(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
