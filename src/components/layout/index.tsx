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
import type { TerminalPanelHandle } from '@/components/layout/terminal';

const TerminalPanel = React.lazy(() =>
  import('./terminal').then((m) => ({ default: m.TerminalPanel }))
);

const TERMINAL_PANEL_HEIGHT_PX = 320;
const CHATBOX_DEFAULT_SIZE = 25;
const CHATBOX_STORAGE_KEY = 'apprecon-chatbox-size';

function getChatboxSize(): number {
  try {
    const saved = localStorage.getItem(CHATBOX_STORAGE_KEY);
    if (saved) {
      const n = Number(saved);
      if (!isNaN(n) && n > 0) return n;
    }
  } catch {}
  return CHATBOX_DEFAULT_SIZE;
}

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const {
    isTerminalOpen,
    toggleTerminal,
  } = useAppLayout();

  const initInspectorListeners = useInspectorStore((state) => state.initListeners);
  const setTerminalHandle = useGlobalTerminalStore((s) => s.setTerminalHandle);
  const isChatboxOpen = useChatboxStore((s) => s.isOpen);
  const closeChatbox = useChatboxStore((s) => s.close);

  const [chatboxSize, setChatboxSize] = React.useState(getChatboxSize);

  const handleChatboxResize = React.useCallback((size: { asPercentage: number }) => {
    const pct = size.asPercentage;
    if (pct > 0) {
      try { localStorage.setItem(CHATBOX_STORAGE_KEY, String(pct)); } catch {}
      setChatboxSize(pct);
    }
  }, []);

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
    <div className="flex h-screen flex-col rounded-md border shadow-2xl">
      <TopNav />
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup
          id="app-layout-panels"
          orientation="horizontal"
          className="h-full"
        >
          <ResizablePanel
            id="app-main-panel"
            defaultSize={isChatboxOpen ? 100 - chatboxSize : 100}
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
          {isChatboxOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel
                id="app-chatbox-panel"
                defaultSize={chatboxSize}
                minSize={15}
                maxSize={60}
                onResize={handleChatboxResize}
              >
                <div className="h-full overflow-hidden bg-background">
                  <AIAssistantPane onClose={closeChatbox} />
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
      <AppFooter
        isTerminalOpen={isTerminalOpen}
        onToggleTerminal={toggleTerminal}
      />
    </div>
  );
}
