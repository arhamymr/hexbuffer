'use client';

import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/app-sidebar';
import { Settings } from '@/components/settings';
import { DashboardContent } from '@/components/dashboard-content';
import { DebuggerPage } from '@/pages/debugger-page';
import { FindingsPage } from '@/components/findings';
import { IntruderPage } from '@/components/intruder';
import { RepeaterPage } from '@/components/repeater';
import { useTargets } from '@/hooks/useTargets';
import { useProxyEvents } from '@/hooks/useProxyEvents';
import type { Target } from '@/types';

export default function App() {
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [currentPage, setCurrentPage] = useState('/');
  const { calls, connections, setCalls, setConnections } = useProxyEvents();
  const { targets, fetchTargets } = useTargets(selectedTarget);

  const handleTargetSelect = useCallback((target: Target | null) => {
    setSelectedTarget(target);
    setCalls([]);
    setConnections([]);
  }, [setCalls, setConnections]);

  const handleScopeUpdated = useCallback(() => {
    fetchTargets();
  }, [fetchTargets]);

  const renderPage = () => {
    switch (currentPage) {
      case '/settings':
        return <Settings />;
      case '/history':
        return (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold">History</h1>
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        );
      case '/repeater':
        return <RepeaterPage />;
      case '/intruder':
        return <IntruderPage />;
      case '/debugger':
        return <DebuggerPage />;
      case '/findings':
        return (
          <FindingsPage
            targets={targets.map((t) => ({ id: t.id, name: t.name }))}
            selectedTargetId={selectedTarget?.id || null}
          />
        );
      default:
        return (
          <DashboardContent
            selectedTarget={selectedTarget}
            connections={connections}
            calls={calls}
            onScopeUpdated={handleScopeUpdated}
          />
        );
    }
  };

  return (
    <AppLayout
      targets={targets}
      selectedTarget={selectedTarget}
      onTargetSelect={handleTargetSelect}
      onTargetUpdated={fetchTargets}
      currentPage={currentPage}
      onNavigate={setCurrentPage}
    >
      {renderPage()}
    </AppLayout>
  );
}
