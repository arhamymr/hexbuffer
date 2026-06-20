'use client';

import { useState } from 'react';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { WebSocketEntryView } from './websocket-entry-view';
import { WebSocketTable } from './websocket-table';

export function WebSocketHistoryView() {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  return (
    <ResizablePanelGroup orientation="vertical" className="flex-1 min-w-0">
      <ResizablePanel defaultSize={60}>
        <WebSocketTable
          selectedConnectionId={selectedConnectionId}
          onSelectConnection={setSelectedConnectionId}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={40}>
        <WebSocketEntryView selectedConnectionId={selectedConnectionId} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
