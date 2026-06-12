'use client';

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GripHorizontal, Loader2, Pause } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';

import { cn } from '@/lib/utils';
import { OpenBrowserButton } from './open-browser';
import { ProxyButton } from './proxy-button';
import { mainNavItems } from './constants';
import { TitlebarButtons } from './titlebar-buttons';
import { TriangleLogo } from './triangle-logo';
import { useTopNav } from './hooks/use-top-nav';
import { useAutomationStore } from '@/stores/automation';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { Separator } from '../ui/separator';
import type { CrawlSession } from '@/pages/browser/types';

type CrawlSessionEventPayload = Partial<CrawlSession> & { sessionId?: string };

export function TopNav() {
  const {
    blinkingItems,
    canScrollLeft,
    canScrollRight,
    handleMouseDown,
    isDraggingWindow,
    navRef,
    pathname,
    proxyStatus,
    stopDraggingWindow,
  } = useTopNav();
  const crawlerStatus = useBrowserAutomationStore((s) => {
    for (const t of s.tabs) {
      const st = t.session?.status;
      if (st === 'running') return 'running';
      if (st === 'paused') return 'paused';
    }
    return null;
  });
  const isAutomationRunning = useAutomationStore((s) =>
    s.runningWorkflowIds.length > 0 ||
    Object.values(s.nodeRuntimeById).some((runtime) => runtime.status === 'running')
  );
  const applySessionStarted = useBrowserAutomationStore((s) => s.applySessionStarted);
  const applySessionUpdated = useBrowserAutomationStore((s) => s.applySessionUpdated);

  useEffect(() => {
    const unlisteners: Array<() => void> = [];
    let mounted = true;

    async function wireBrowserSessionEvents() {
      try {
        unlisteners.push(await listen<CrawlSession>('ai-browser:session-started', (event) => {
          applySessionStarted(event.payload);
        }));
        unlisteners.push(await listen<CrawlSessionEventPayload>('ai-browser:session-updated', (event) => {
          applySessionUpdated(event.payload);
        }));
        unlisteners.push(await listen<CrawlSessionEventPayload>('ai-browser:session-finished', (event) => {
          applySessionUpdated({ ...event.payload, status: 'completed' });
        }));
        unlisteners.push(await listen<{ message?: string; sessionId?: string }>('ai-browser:session-failed', (event) => {
          applySessionUpdated({
            id: event.payload?.sessionId,
            sessionId: event.payload?.sessionId,
            status: 'failed',
            finishedAt: new Date().toISOString(),
          });
        }));
      } catch (error) {
        if (mounted) {
          console.warn('[top nav] Browser session event listeners are unavailable in this runtime.', error);
        }
      }
    }

    wireBrowserSessionEvents();

    return () => {
      mounted = false;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [applySessionStarted, applySessionUpdated]);

  return (
    <header
      className={cn(
        'flex shrink-0 justify-between text-muted-foreground title-bar border-b bg-background backdrop-blur sticky top-0 z-50',
        isDraggingWindow ? 'cursor-grabbing' : 'cursor-grab',
      )}
      onMouseDown={handleMouseDown}
      onMouseUp={stopDraggingWindow}
      onMouseLeave={stopDraggingWindow}
    >
      <div className="flex w-full items-center justify-between h-8.5 px-4">
        <div className='flex min-w-0 flex-1 items-center align-center gap-4'>
          <TitlebarButtons />
          <div className='h-5'>
            <Separator orientation="vertical" className="h-6" />
          </div>
          <Link to="/" className="group flex items-center gap-1 no-underline">
            <TriangleLogo />
            <p className={cn(
              proxyStatus === "connected" ? "text-primary" : "text-muted-foreground",
              "max-w-0 overflow-hidden whitespace-nowrap text-sm font-mono opacity-0 transition-all duration-200 no-underline group-hover:max-w-20 group-hover:opacity-100")}>
              0xbuffer
            </p>
          </Link>

          <div className="relative min-w-0 flex-1">
            <nav
              ref={navRef}
              className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overflow-y-hidden"
            >
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const RightIcon = item.rightIcon;
                const isActive = pathname === item.href;
                const isBlinking = blinkingItems.has(item.href);
                const showAutomationStatusIcon =
                  item.href === '/automation' && isAutomationRunning;
                const showBrowserStatusIcon =
                  item.href === '/browser-automation' && crawlerStatus !== null;
                const showStatusIcon = showAutomationStatusIcon || showBrowserStatusIcon;

                const StatusIcon =
                  showAutomationStatusIcon ? Loader2 :
                    crawlerStatus === 'paused' ? Pause :
                      Loader2;

                const statusIconClass =
                  showAutomationStatusIcon ? 'size-3 animate-spin text-primary' :
                    crawlerStatus === 'running' ? 'size-3 animate-spin text-primary' :
                    crawlerStatus === 'paused' ? 'size-3 text-amber-500' :
                      'size-3 text-muted-foreground';

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`
                    flex shrink-0 items-center gap-2 whitespace-nowrap px-2 py-2 text-xs transition-colors
                    border-b-2
                    ${isActive
                        ? 'border-primary text-primary bg-muted/30'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 '
                      }
                  `}
                  >
                    <Icon className="size-3.5" />
                    <span className={isBlinking ? 'animate-nav-blink' : ''}>{item.label}</span>
                    {RightIcon && <RightIcon className="size-3.5" />}
                    {showStatusIcon && !RightIcon && (
                      <StatusIcon className={statusIconClass} />
                    )}
                  </Link>
                );
              })}
            </nav>
            <div
              className={`
                pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent transition-opacity
                ${canScrollLeft ? 'opacity-100' : 'opacity-0'}
              `}
            />
            <div
              className={`
                pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent transition-opacity
                ${canScrollRight ? 'opacity-100' : 'opacity-0'}
              `}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 h-5 bg-background pl-2">
          <ProxyButton />
          <OpenBrowserButton />
          <div
            className='flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground cursor-grab'
            title="Drag window"
            onMouseDown={handleMouseDown}
          >
            <GripHorizontal className="size-5" />
          </div>
        </div>
      </div>
    </header>
  );
}
