'use client';

import * as React from 'react';
import { AppFooter } from '@/components/layout/footer';
import { TopNav } from './top-nav';
import { useAppLayout } from './hooks/use-app-layout';
import { useInspectorStore } from '@/stores/inspector';
import { useGlobalTerminalStore } from '@/stores/global-terminal';
import type { TerminalPanelHandle } from '@/components/layout/terminal';

const TerminalPanel = React.lazy(() =>
  import('./terminal').then((m) => ({ default: m.TerminalPanel }))
);
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

const TERMINAL_PANEL_DEFAULT_SIZE = 30;
const TERMINAL_PANEL_MIN_SIZE = 15;
const TERMINAL_PANEL_COLLAPSED_SIZE = 0;

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const {
    isTerminalOpen,
    toggleTerminal,
    terminalPanelRef,
  } = useAppLayout();

  const initInspectorListeners = useInspectorStore((state) => state.initListeners);
  const setTerminalHandle = useGlobalTerminalStore((s) => s.setTerminalHandle);

  const handleTerminalRef = React.useCallback(
    (handle: TerminalPanelHandle | null) => {
      setTerminalHandle(handle);
    },
    [setTerminalHandle],
  );

  React.useEffect(() => {
    initInspectorListeners();
  }, [initInspectorListeners]);

  // Clear terminal handle on unmount
  React.useEffect(() => {
    return () => setTerminalHandle(null);
  }, [setTerminalHandle]);

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col rounded-md border shadow-2xl">
      <TopNav />
      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel
            defaultSize={isTerminalOpen ? 100 - TERMINAL_PANEL_DEFAULT_SIZE : 100}
            minSize={30}
          >
            <section className="h-full min-w-0 overflow-hidden">
              {children}
            </section>
          </ResizablePanel>
          {isTerminalOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                panelRef={terminalPanelRef}
                defaultSize={TERMINAL_PANEL_DEFAULT_SIZE}
                minSize={TERMINAL_PANEL_MIN_SIZE}
                collapsedSize={TERMINAL_PANEL_COLLAPSED_SIZE}
                collapsible
                onResize={(size) => {
                  if (size.asPercentage <= TERMINAL_PANEL_COLLAPSED_SIZE && isTerminalOpen) toggleTerminal();
                }}
              >
                <React.Suspense fallback={null}>
                  <div className="h-full">
                    <TerminalPanel ref={handleTerminalRef} onClosePanel={toggleTerminal} />
                  </div>
                </React.Suspense>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </main>
      <AppFooter
        isTerminalOpen={isTerminalOpen}
        onToggleTerminal={toggleTerminal}
      />
    </div>
  );
}
