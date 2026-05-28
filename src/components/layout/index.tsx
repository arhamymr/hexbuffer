'use client';

import * as React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { AppFooter } from '@/components/footer';
import { cn } from '@/lib/utils';
import { TopNav } from './top-nav';
import { AIAssistantPane } from './ai-assistant-pane';

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false);
  const appWindow = React.useMemo(() => getCurrentWindow(), []);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    let unlistenResize: (() => void) | undefined;

    const updateFullscreenState = async () => {
      const fullscreen = await appWindow.isFullscreen();

      if (isMounted) {
        setIsFullscreen(fullscreen);
      }
    };

    const setupListener = async () => {
      updateFullscreenState();
      const unlisten = await appWindow.onResized(updateFullscreenState);
      unlistenResize = unlisten;
    };

    setupListener();

    return () => {
      isMounted = false;
      unlistenResize?.();
    };
  }, [appWindow]);

  const handleToggleFullscreen = React.useCallback(async () => {
    await appWindow.setFullscreen(!isFullscreen);
  }, [appWindow, isFullscreen]);

  return (
    <div
      className={cn(
        'h-screen overflow-hidden bg-background flex flex-col',
        isFullscreen ? 'rounded-none border-0 shadow-none' : 'rounded-md border shadow-2xl',
      )}
    >
      <TopNav isFullscreen={isFullscreen} onToggleFullscreen={handleToggleFullscreen} />
      <main className="relative flex min-h-0 flex-1 overflow-hidden p-2">
        <section className={cn('min-w-0 flex-1 overflow-hidden', isAssistantOpen && 'lg:pr-2')}>
          {children}
        </section>
        {isAssistantOpen && <AIAssistantPane />}
      </main>
      <AppFooter
        isAssistantOpen={isAssistantOpen}
        onToggleAssistant={() => setIsAssistantOpen((current) => !current)}
      />
    </div>
  );
}
