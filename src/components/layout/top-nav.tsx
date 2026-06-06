'use client';

import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { GripHorizontal } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app';
import { useNavStore } from '@/stores/nav';
import { OpenBrowserButton } from './open-browser';
import { ProxyButton } from './proxy-button';
import { mainNavItems } from './constants';
import { TitlebarButtons } from './titlebar-buttons';
import { Separator } from '../ui/separator';
import { TriangleLogo } from './triangle-logo';

export function TopNav() {
  const location = useLocation();
  const pathname = location.pathname;
  const appWindow = React.useMemo(() => getCurrentWindow(), []);
  const navRef = React.useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [isDraggingWindow, setIsDraggingWindow] = React.useState(false);
  const proxyStatus = useAppStore((state) => state.proxyStatus);
  const blinkingItems = useNavStore((state) => state.blinkingItems);

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
    <header data-tauri-drag-region
      className={cn(
        'flex shrink-0 justify-between text-muted-foreground title-bar border-b bg-background backdrop-blur sticky top-0 z-50',
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
    >
      <div className="flex w-full items-center justify-between h-8.5 px-4">
        <div className='flex min-w-0 flex-1 items-center align-center gap-4'>
          <TitlebarButtons />
          <div className="group flex items-center gap-1">
            <TriangleLogo />
            <p className={cn(
              proxyStatus === "connected" ? "text-primary" : "text-muted-foreground",
              "max-w-0 overflow-hidden whitespace-nowrap text-sm font-mono opacity-0 transition-all duration-200 no-underline group-hover:max-w-20 group-hover:opacity-100")}>
              0xbuffer
            </p>
          </div>

          <div className="relative min-w-0 flex-1">
            <nav
              ref={navRef}
              className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overflow-y-hidden"
            >
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                const isBlinking = blinkingItems.has(item.href);

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`
                    flex shrink-0 items-center gap-2 whitespace-nowrap px-2 py-2 text-xs transition-colors
                    border-b-2
                    ${isActive
                        ? 'border-green-500 text-foreground bg-muted/30'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-t-md'
                      }
                  `}
                  >
                    <Icon className="size-3.5" />
                    <span className={isBlinking ? 'animate-nav-blink' : ''}>{item.label}</span>
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
            data-tauri-drag-region
            className='flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground'
            title="Drag window"
          >
            <GripHorizontal className="size-5" data-tauri-drag-region />
          </div>
        </div>
      </div>
    </header>
  );
}
