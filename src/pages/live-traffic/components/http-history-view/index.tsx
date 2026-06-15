'use client';

import { LogEntryBurpView } from '../log-table/log-entry-view';
import { TrafficTable } from '../log-table/calls-columns';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

interface HttpHistoryViewProps {
  isPinnedTabActive?: boolean;
}

export function HttpHistoryView({ isPinnedTabActive = false }: HttpHistoryViewProps) {
  return (
    <ResizablePanelGroup orientation="vertical" className="flex-1">
      <ResizablePanel defaultSize={60}>
        <TrafficTable isPinnedTabActive={isPinnedTabActive} />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={40} className='bg-muted'>
        <LogEntryBurpView />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
