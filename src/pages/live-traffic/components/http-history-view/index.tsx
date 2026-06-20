'use client';

import { LogEntryBurpView } from '../log-table/log-entry-view';
import { TrafficTable } from '../log-table/calls-columns';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useHistoryQuery } from '@/pages/live-traffic/hooks/use-history-query';

interface HttpHistoryViewProps {
  isPinnedTabActive?: boolean;
  isGroupTabActive?: boolean;
  activeGroupId?: string | null;
}

export function HttpHistoryView({ isPinnedTabActive = false, isGroupTabActive = false, activeGroupId = null }: HttpHistoryViewProps) {
  const { selectedCallId } = useHistoryQuery();

  const table = (
    <div className="h-full overflow-hidden min-w-0" style={{ width: '100%' }}>
      <TrafficTable isPinnedTabActive={isPinnedTabActive} isGroupTabActive={isGroupTabActive} activeGroupId={activeGroupId} />
    </div>
  );

  if (!selectedCallId) {
    return table;
  }

  return (
    <ResizablePanelGroup orientation="vertical" id="http-history-view" className="h-full min-w-0">
      <ResizablePanel id="http-history-table" defaultSize={60} minSize={20} className="min-w-0">
        {table}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel id="http-history-detail" defaultSize={40} minSize={15} className="bg-muted">
        <div className="h-full overflow-y-auto">
          <LogEntryBurpView />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
