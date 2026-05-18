'use client';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { WebSocketEntryView } from './websocket-entry-view';
import { WebSocketTable } from './websocket-table';

export function WebSocketHistoryView() {
  return (
    <ResizablePanelGroup orientation="vertical" className="flex-1">
      <ResizablePanel defaultSize={60}>
        <WebSocketTable />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={40}>
        <WebSocketEntryView />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
