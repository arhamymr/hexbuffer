'use client';

import { ArrowUpDown, Crosshair, RefreshCw } from 'lucide-react';
import { DashboardCard } from './components/dashboard-card';
import { useDashboardPage } from './hooks/use-dashboard-page';

export function DashboardPage() {
  const { liveTraffic, bruteForce, repeater } = useDashboardPage();

  const proxyStatusLabel =
    liveTraffic.proxyStatus === 'connected'
      ? `Connected :${liveTraffic.proxyPort}`
      : liveTraffic.proxyStatus === 'starting'
        ? 'Starting\u2026'
        : liveTraffic.proxyStatus === 'stopping'
          ? 'Stopping\u2026'
          : 'Disconnected';

  const isProxyRunning = liveTraffic.proxyStatus === 'connected';

  const liveTrafficStats = [
    {
      label: 'Proxy',
      value: (
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`
              relative inline-flex h-2 w-2 rounded-full
              ${isProxyRunning ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]' : 'bg-muted-foreground/40'}
            `}
          />
          {proxyStatusLabel}
        </span>
      ),
    },
    { label: 'HTTP calls', value: liveTraffic.httpTotalCalls.toLocaleString() },
    { label: 'WS connections', value: liveTraffic.wsConnectionCount.toLocaleString() },
    {
      label: 'Targets active / total',
      value: `${liveTraffic.activeTargets} / ${liveTraffic.totalTargets}`,
    },
  ];

  const bruteForceStats = [
    { label: 'Attack tabs', value: bruteForce.tabsOpen },
    {
      label: 'Running',
      value: bruteForce.attacksRunning > 0 ? bruteForce.attacksRunning : 'Idle',
    },
    { label: 'Results', value: bruteForce.totalResults.toLocaleString() },
    { label: 'Bypass patterns', value: bruteForce.bypassPatterns },
  ];

  const repeaterStats = [
    { label: 'HTTP tabs', value: repeater.httpTabs },
    { label: 'WS tabs', value: repeater.wsTabs },
    { label: 'Have response', value: repeater.tabsWithResponses },
    { label: 'WS connected', value: repeater.activeWsConnections },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of proxy activity and feature usage</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 content-start">
        <DashboardCard
          title="Live Traffic"
          icon={ArrowUpDown}
          stats={liveTrafficStats}
          to="/live-traffic"
        />
        <DashboardCard
          title="Brute Force"
          icon={Crosshair}
          stats={bruteForceStats}
          to="/brute-force"
        />
        <DashboardCard
          title="Repeater"
          icon={RefreshCw}
          stats={repeaterStats}
          to="/repeater"
        />
      </div>
    </div>
  );
}
