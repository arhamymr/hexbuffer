'use client';

import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {  GripHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app';
import { OpenBrowserButton } from './open-browser';
import { ProxyButton } from './proxy-button';
import { mainNavItems } from './constants';
import { TitlebarButtons } from './titlebar-buttons';
import { Separator } from '../ui/separator';

export function TopNav() {
  const location = useLocation();
  const pathname = location.pathname;
  const appWindow = React.useMemo(() => getCurrentWindow(), []);
  const navRef = React.useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [isDraggingWindow, setIsDraggingWindow] = React.useState(false);
  const proxyStatus = useAppStore((state) => state.proxyStatus);


  React.useEffect(() => {
    const nav = navRef.current;

    if (!nav) {
      return;
    }

    const updateScrollIndicators = () => {
      const { scrollLeft, scrollWidth, clientWidth } = nav;

      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    };

    updateScrollIndicators();

    nav.addEventListener('scroll', updateScrollIndicators);

    const resizeObserver = new ResizeObserver(updateScrollIndicators);
    resizeObserver.observe(nav);

    return () => {
      nav.removeEventListener('scroll', updateScrollIndicators);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <header data-tauri-drag-region className="title-bar border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex items-center justify-between h-8.5 px-4">
        <div className='flex min-w-0 flex-1 items-center align-center gap-4'>
          <div
            data-tauri-drag-region
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground',
              isDraggingWindow ? 'cursor-grabbing' : 'cursor-grab',
            )}
            onMouseDown={(event) => {
              if (event.buttons === 1) {
                setIsDraggingWindow(true);
                appWindow.startDragging();
              }
            }}
            onMouseUp={() => setIsDraggingWindow(false)}
            onMouseLeave={() => setIsDraggingWindow(false)}
            title="Drag window"
          >
            <GripHorizontal className="size-5" data-tauri-drag-region />
          </div>
          <div className="flex items-center gap-1">
            <p className='text-sm font-bold font-mono hover:text-green-500 text-foreground transition-colors no-underline'>0xbuffer</p>
          </div>

          <div className="relative min-w-0 flex-1">
            <nav
              ref={navRef}
              className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overflow-y-hidden"
            >
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const showProxyIndicator = item.href === '/' && proxyStatus === 'connected';
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`
                    flex shrink-0 items-center gap-2 whitespace-nowrap px-2 py-2 text-sm transition-colors
                    border-b border-b-2
                    ${isActive
                        ? 'border-green-500 text-foreground bg-muted/30'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-t-md'
                      }
                  `}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{item.label}</span>
                    {showProxyIndicator && (
                      <span
                        className="relative flex h-2 w-2"
                        aria-label="Proxy running"
                        title="Proxy running"
                      >
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.9)]" />
                      </span>
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

        <div className="flex shrink-0 items-center gap-2 h-5">
          <ProxyButton />

          <OpenBrowserButton />
          <Separator orientation='vertical'/>
          <TitlebarButtons />
        </div>
      </div>
    </header>
  );
}
