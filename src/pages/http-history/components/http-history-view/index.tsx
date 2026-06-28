import { useRef, useState, useCallback } from 'react';
import { LogEntryBurpView } from '../log-table/log-entry-view';
import { TrafficTable } from '../log-table/calls-columns';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useHttpHistoryQueryStore } from '@/pages/http-history/state/history-query-store';

interface HttpHistoryViewProps {
  isPinnedTabActive?: boolean;
  isGroupTabActive?: boolean;
  activeGroupId?: string | null;
}

export function HttpHistoryView({ isPinnedTabActive = false, isGroupTabActive = false, activeGroupId = null }: HttpHistoryViewProps) {
  const selectedCallId = useHttpHistoryQueryStore((state) => state.selectedCallId);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const handlePointerDown = useCallback(() => {
    isDraggingRef.current = true;
    setIsDragging(true);

    const onPointerUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointerup', onPointerUp, { once: true });
  }, []);

  // Suppress pointer events on panel contents while dragging so CodeMirror
  // editors (and the virtual traffic table) don't intercept mousemove events —
  // the #1 cause of laggy/stuck resize handles in panels with rich editors.
  const coverStyle = isDragging
    ? { pointerEvents: 'none' as const, userSelect: 'none' as const }
    : undefined;

  const table = (
    <div className="h-full overflow-hidden min-w-0" style={{ width: '100%', ...coverStyle }}>
      <TrafficTable isPinnedTabActive={isPinnedTabActive} isGroupTabActive={isGroupTabActive} activeGroupId={activeGroupId} />
    </div>
  );

  return (
    <ResizablePanelGroup
      orientation="vertical"
      id="http-history-view"
      className="h-full min-w-0"
    >
      <ResizablePanel id="http-history-table" defaultSize={selectedCallId ? 60 : 100} minSize={20} className="min-w-0">
        {table}
      </ResizablePanel>
      {selectedCallId && (
        <>
          <ResizableHandle
            withHandle
            onPointerDown={handlePointerDown}
          />
          <ResizablePanel id="http-history-detail" defaultSize={40} minSize={15} className="bg-muted">
            {/* overflow-hidden: let LogEntryBurpView's inner panels manage scrolling */}
            <div className="h-full overflow-hidden" style={coverStyle}>
              <LogEntryBurpView />
            </div>
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
