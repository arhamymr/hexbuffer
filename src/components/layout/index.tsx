'use client';

import * as React from 'react';
import { AppFooter } from '@/components/layout/footer';
import { TopNav } from './top-nav';
import { AIAssistantPane } from './assistant';
import { useAppLayout } from './hooks/use-app-layout';
import { useInspectorStore } from '@/stores/inspector';
import { useGlobalTerminalStore } from '@/stores/global-terminal';
import { useChatboxStore } from '@/stores/chatbox';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { AppSidebar } from './floating-bar';
import type { TerminalPanelHandle } from '@/components/layout/terminal';

const TerminalPanel = React.lazy(() =>
  import('./terminal').then((m) => ({ default: m.TerminalPanel }))
);

const CHATBOX_DEFAULT_SIZE = 25;

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const {
    isTerminalOpen,
    toggleTerminal,
  } = useAppLayout();

  const initInspectorListeners = useInspectorStore((state) => state.initListeners);
  const setTerminalHandle = useGlobalTerminalStore((s) => s.setTerminalHandle);
  const isChatboxOpen = useChatboxStore((s) => s.isOpen);
  const closeChatbox = useChatboxStore((s) => s.close);


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
    <div className="flex h-screen flex-col rounded-md border bg-background">
      <TopNav />
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup
          key={isChatboxOpen ? 'with-chatbox' : 'without-chatbox'}
          orientation="horizontal"
          className="h-full"
        >
           {isChatboxOpen && (
            <>
              <ResizablePanel
                id="app-chatbox-panel"
                defaultSize={CHATBOX_DEFAULT_SIZE}
                minSize={15}
              >
                <div className="h-full overflow-hidden bg-background">
                  <AIAssistantPane onClose={closeChatbox} />
                </div>
              </ResizablePanel>
               <ResizableHandle withHandle />
            </>
          )}
          <ResizablePanel
            id="app-main-panel"
            defaultSize={isChatboxOpen ? 100 - CHATBOX_DEFAULT_SIZE : 100}
            minSize={30}
          >
            <ResizablePanelGroup
              key={isTerminalOpen ? 'with-terminal' : 'without-terminal'}
              orientation="vertical"
              className="h-full"
            >
              <ResizablePanel defaultSize={75} minSize={30}>
                <div className="h-full overflow-hidden bg-background">
                  <section className="h-full min-w-0 overflow-hidden">
                    {children}
                  </section>
                </div>
              </ResizablePanel>
              {isTerminalOpen && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={10}>
                    <React.Suspense fallback={null}>
                      <div className="h-full bg-background">
                        <TerminalPanel ref={handleTerminalRef} onClosePanel={toggleTerminal} />
                      </div>
                    </React.Suspense>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>
         
        </ResizablePanelGroup>
      </div>
      <AppSidebar />
      <AppFooter />
    </div>
  );
}
