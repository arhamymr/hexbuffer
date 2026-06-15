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

const TERMINAL_PANEL_HEIGHT_PX = 320;

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const {
    isTerminalOpen,
    toggleTerminal,
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
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <section className="min-h-0 min-w-0 flex-1 overflow-hidden">
          {children}
        </section>
        {isTerminalOpen && (
          <React.Suspense fallback={null}>
            <section
              className="shrink-0 border-t bg-background"
              style={{ height: TERMINAL_PANEL_HEIGHT_PX }}
            >
              <TerminalPanel ref={handleTerminalRef} onClosePanel={toggleTerminal} />
            </section>
          </React.Suspense>
        )}
      </main>
      <AppFooter
        isTerminalOpen={isTerminalOpen}
        onToggleTerminal={toggleTerminal}
      />
    </div>
  );
}
