import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GripHorizontal, Loader2, Pause } from 'lucide-react';

import { cn } from '@/lib/utils';
import { OpenBrowserButton } from './open-browser';
import { ProxyButton } from './proxy-button';
import { mainNavItems, navCategories } from './constants';
import { TitlebarButtons } from './titlebar-buttons';
import { TriangleLogo } from './triangle-logo';
import { useTopNav } from './hooks/use-top-nav';
import { useBrowserSessionEvents } from './hooks/use-browser-session-events';
import { useAutomationStore } from '@/stores/automation';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { useAppSettingsStore } from '@/stores/app-settings-store';
import { Separator } from '../ui/separator';
import { GlobalSearch } from './global-search';

type CrawlStatusKey = 'automation-running' | 'browser-running' | 'browser-paused';

const STATUS_CONFIG: Record<CrawlStatusKey, { icon: typeof Loader2; className: string }> = {
  'automation-running': { icon: Loader2, className: 'size-3 animate-spin text-primary' },
  'browser-running': { icon: Loader2, className: 'size-3 animate-spin text-primary' },
  'browser-paused': { icon: Pause, className: 'size-3 text-amber-500' },
};

function resolveNavStatus(
  href: string,
  isAutomationRunning: boolean,
  crawlerStatus: 'running' | 'paused' | null,
): CrawlStatusKey | null {
  if (href === '/automation' && isAutomationRunning) return 'automation-running';
  if (href === '/browser-automation') {
    if (crawlerStatus === 'running') return 'browser-running';
    if (crawlerStatus === 'paused') return 'browser-paused';
  }
  return null;
}

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
  const navigate = useNavigate();
  const hiddenNavItems = useAppSettingsStore((s) => s.hiddenNavItems);

  // Find which category is active based on current route
  const activeCategory = React.useMemo(
    () => navCategories.find((cat) => cat.items.some((item) => item.href === pathname)) ?? null,
    [pathname],
  );

  const visibleNavItems = React.useMemo(() => {
    const base = mainNavItems.filter((item) => !hiddenNavItems.includes(item.href));
    if (!activeCategory) return base;
    const categoryHrefs = new Set(activeCategory.items.map((i) => i.href));
    return base.filter((item) => categoryHrefs.has(item.href));
  }, [hiddenNavItems, activeCategory]);

  React.useEffect(() => {
    if (hiddenNavItems.includes(pathname)) {
      navigate('/');
    }
  }, [hiddenNavItems, pathname, navigate]);

  const crawlerStatus = useBrowserAutomationStore((s) => {
    for (const t of s.tabs) {
      if (t.session?.status === 'running') return 'running';
      if (t.session?.status === 'paused') return 'paused';
    }
    return null;
  });
  const isAutomationRunning = useAutomationStore((s) =>
    s.runningWorkflowIds.length > 0 ||
    Object.values(s.nodeRuntimeById).some((runtime) => runtime.status === 'running')
  );
  const applySessionStarted = useBrowserAutomationStore((s) => s.applySessionStarted);
  const applySessionUpdated = useBrowserAutomationStore((s) => s.applySessionUpdated);

  useBrowserSessionEvents(applySessionStarted, applySessionUpdated);

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
              hexbuffer
            </p>
          </Link>

          <div className="relative min-w-0 flex-1">
            <nav
              ref={navRef}
              className="scrollbar-hide flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overflow-y-hidden"
            >
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const RightIcon = item.rightIcon;
                const isActive = pathname === item.href;
                const isBlinking = blinkingItems.has(item.href);

                const navStatus = resolveNavStatus(item.href, isAutomationRunning, crawlerStatus);
                const StatusIconComp = navStatus ? STATUS_CONFIG[navStatus].icon : null;
                const statusCls = navStatus ? STATUS_CONFIG[navStatus].className : '';
                const showStatusIcon = StatusIconComp && !RightIcon;

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
                    {showStatusIcon && <StatusIconComp className={statusCls} />}
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

        <div className="flex shrink-0 items-center">
          <GlobalSearch />
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
