import { Activity, Clock, Globe, Shield, Wifi } from 'lucide-react';
import type { ComponentType } from 'react';
import { Card } from '@/components/ui/card';
import type { CollaboratorDashboardStats } from '../types';

interface CollaboratorMetricsProps {
  stats: CollaboratorDashboardStats;
}

export function CollaboratorMetrics({ stats }: CollaboratorMetricsProps) {
  return (
    <div className="grid shrink-0 grid-cols-2 gap-2 border-b bg-background p-2 md:grid-cols-4 lg:grid-cols-7">
      <MetricCard label="Active Payloads" value={stats.activePayloads} icon={Shield} />
      <MetricCard label="Interactions Today" value={stats.interactionsToday} icon={Activity} />
      <MetricCard label="DNS Events" value={stats.dnsEvents} icon={Globe} />
      <MetricCard label="HTTP Events" value={stats.httpEvents} icon={Wifi} />
      <MetricCard label="HTTPS Events" value={stats.httpsEvents} icon={Wifi} />
      <MetricCard
        label="Last Callback"
        value={stats.lastCallback ? formatRelative(stats.lastCallback) : 'Never'}
        icon={Clock}
      />
      <MetricCard label="Connected Servers" value={stats.connectedServers} icon={Wifi} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="p-2">
      <div className="flex items-center gap-2">
        <Icon className="text-muted-foreground h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-[10px]">{label}</p>
          <p className="truncate text-sm font-semibold">{value}</p>
        </div>
      </div>
    </Card>
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
