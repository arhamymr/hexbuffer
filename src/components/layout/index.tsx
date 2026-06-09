'use client';

import * as React from 'react';
import { AppFooter } from '@/components/layout/footer';
import { TopNav } from './top-nav';
import { AIAssistantPane } from './ai-chat';
import { useAppLayout } from './hooks/use-app-layout';
import { useInspectorStore } from '@/stores/inspector';

const TerminalPanel = React.lazy(() =>
  import('./terminal').then((m) => ({ default: m.TerminalPanel }))
);
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

const ASSISTANT_PANEL_DEFAULT_SIZE = 40;
const ASSISTANT_PANEL_MIN_SIZE = 18;
const ASSISTANT_PANEL_COLLAPSED_SIZE = 0;

const TERMINAL_PANEL_DEFAULT_SIZE = 30;
const TERMINAL_PANEL_MIN_SIZE = 15;
const TERMINAL_PANEL_COLLAPSED_SIZE = 0;

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const {
    isAssistantOpen,
    toggleAssistant,
    assistantPanelRef,
    isTerminalOpen,
    toggleTerminal,
    terminalPanelRef,
  } = useAppLayout();

  const initInspectorListeners = useInspectorStore((state) => state.initListeners);

  React.useEffect(() => {
    initInspectorListeners();
  }, [initInspectorListeners]);

  return (
    <div className="h-screen overflow-hidden bg-background flex flex-col rounded-md border shadow-2xl">
      <TopNav />
      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          {/* Left: main feature + terminal stacked vertically */}
          <ResizablePanel defaultSize={isAssistantOpen ? 100 - ASSISTANT_PANEL_DEFAULT_SIZE : 100} minSize={30}>
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel
                defaultSize={isTerminalOpen ? 100 - TERMINAL_PANEL_DEFAULT_SIZE : 100}
                minSize={30}
              >
                <section className="h-full min-w-0 overflow-hidden">
                  {children}
                </section>
              </ResizablePanel>
              {isTerminalOpen && <ResizableHandle withHandle />}
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
                    <TerminalPanel onClosePanel={toggleTerminal} />
                  </div>
                </React.Suspense>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* Right: AI assistant */}
          {isAssistantOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                panelRef={assistantPanelRef}
                defaultSize={ASSISTANT_PANEL_DEFAULT_SIZE}
                minSize={ASSISTANT_PANEL_MIN_SIZE}
                maxSize="600px"
                collapsedSize={ASSISTANT_PANEL_COLLAPSED_SIZE}
                collapsible
                onResize={(size) => {
                  if (size.asPercentage <= ASSISTANT_PANEL_COLLAPSED_SIZE && isAssistantOpen) toggleAssistant();
                }}
              >
                <AIAssistantPane />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </main>
      <AppFooter
        isAssistantOpen={isAssistantOpen}
        onToggleAssistant={toggleAssistant}
        isTerminalOpen={isTerminalOpen}
        onToggleTerminal={toggleTerminal}
      />
    </div>
  );
}
