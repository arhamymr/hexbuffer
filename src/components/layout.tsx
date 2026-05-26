'use client';

import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Crosshair, Settings, Moon, Sun, ArrowUpDown, RefreshCw, Wrench, Bot, FileText, MessageSquare, PauseCircle, Globe, GripHorizontal, Minus, Square, X } from 'lucide-react';
import { useTheme } from './theme-provider';
import { Button } from './ui/button';

import { AppFooter } from './footer';
import { DashboardComposer } from '@/pages/ai-chat/components/composer';
import { DashboardThread } from '@/pages/ai-chat/components/thread';
import { useDashboardPage } from '@/pages/ai-chat/hooks/use-dashboard-page';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

const mainNavItems = [
  { label: 'Live Traffic', icon: ArrowUpDown, href: '/' },
  { label: 'Intercept', icon: PauseCircle, href: '/intercept' },
  { label: 'Brute Force', icon: Crosshair, href: '/brute-force' },
  { label: 'Repeater', icon: RefreshCw, href: '/repeater' },
  { label: 'Browser', icon: Globe, href: '/browser-automation' },
  { label: 'Documents', icon: FileText, href: '/documents' },
  { label: 'AI Tools', icon: Bot, href: '/ai-tools' },
  { label: 'Tools', icon: Wrench, href: '/tools' },
];

interface TopNavProps {
  isAssistantOpen: boolean;
  onToggleAssistant: () => void;
}

export function TopNav({ isAssistantOpen, onToggleAssistant }: TopNavProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const { theme, toggleTheme } = useTheme();
  const appWindow = React.useMemo(() => getCurrentWindow(), []);
  const navRef = React.useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [isDraggingWindow, setIsDraggingWindow] = React.useState(false);

  React.useEffect(() => {
    const minimizeButton = document.getElementById('titlebar-minimize');
    const maximizeButton = document.getElementById('titlebar-maximize');
    const closeButton = document.getElementById('titlebar-close');
    const minimize = () => appWindow.minimize();
    const maximize = () => appWindow.toggleMaximize();
    const close = () => appWindow.close();

    minimizeButton?.addEventListener('click', minimize);
    maximizeButton?.addEventListener('click', maximize);
    closeButton?.addEventListener('click', close);

    return () => {
      minimizeButton?.removeEventListener('click', minimize);
      maximizeButton?.removeEventListener('click', maximize);
      closeButton?.removeEventListener('click', close);
    };
  }, [appWindow]);

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
            {/* Light mode */}
            <p className='text-xl'>✦</p>
            <p className='text-sm font-bold mt-1'>0xbuffer</p>
          </div>

          <div className="relative min-w-0 flex-1">
            <nav
              ref={navRef}
              className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overflow-y-hidden"
            >
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
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

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-8 w-8 p-0"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className={cn('h-8 w-8 p-0', isAssistantOpen && 'bg-muted text-foreground')}
            onClick={onToggleAssistant}
            title={isAssistantOpen ? 'Hide Chat' : 'Show Chat'}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Link to="/settings">
            <Button
              variant="ghost"
              size="xs"
              className="h-8 w-8 p-0"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <div className="ml-1 flex items-center border-l pl-1">
            <Button
              id="titlebar-minimize"
              variant="ghost"
              size="xs"
              className="h-8 w-8 p-0"
              title="Minimize"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              id="titlebar-maximize"
              variant="ghost"
              size="xs"
              className="h-8 w-8 p-0"
              title="Maximize"
            >
              <Square className="size-3.5" />
            </Button>
            <Button
              id="titlebar-close"
              variant="ghost"
              size="xs"
              className="p-2 hover:bg-destructive hover:text-destructive-foreground/80 dark:hover:bg-destructive/80"
              title="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function AIAssistantPane() {
  const {
    framework,
    handleAnalyze,
    isAnalyzing,
    libraryTargets,
    messages,
    model,
    prompt,
    selectedTarget,
    selectedTargetId,
    setFramework,
    setModel,
    setPrompt,
    setSelectedTargetId,
    usingDummyData,
  } = useDashboardPage();

  return (
    <aside className="absolute inset-2 z-40 flex min-h-0 flex-col overflow-hidden rounded-md border bg-background p-2 shadow-lg lg:static lg:z-auto lg:h-full lg:w-[clamp(320px,30vw,460px)] lg:shrink-0 lg:rounded-none lg:border-y-0 lg:border-r-0 lg:pl-2 lg:shadow-none">
      <DashboardThread
        libraryCount={libraryTargets.length}
        messages={messages}
        selectedTarget={selectedTarget}
        usingDummyData={usingDummyData}
      />
      <DashboardComposer
        framework={framework}
        isAnalyzing={isAnalyzing}
        libraryTargets={libraryTargets}
        model={model}
        onAnalyze={handleAnalyze}
        prompt={prompt}
        selectedTarget={selectedTarget}
        selectedTargetId={selectedTargetId}
        setFramework={setFramework}
        setModel={setModel}
        setPrompt={setPrompt}
        setSelectedTargetId={setSelectedTargetId}
      />
    </aside>
  );
}

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false);
  const appWindow = React.useMemo(() => getCurrentWindow(), []);
  const [isWindowMaximized, setIsWindowMaximized] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;
    let unlistenResize: (() => void) | undefined;

    const updateMaximizedState = async () => {
      const maximized = await appWindow.isMaximized();

      if (isMounted) {
        setIsWindowMaximized(maximized);
      }
    };

    updateMaximizedState();

    appWindow.onResized(updateMaximizedState).then((unlisten) => {
      unlistenResize = unlisten;
    });

    return () => {
      isMounted = false;
      unlistenResize?.();
    };
  }, [appWindow]);

  return (
    <div
      className={cn(
        'h-screen overflow-hidden bg-background flex flex-col',
        isWindowMaximized ? 'rounded-none border-0 shadow-none' : 'rounded-md border shadow-2xl',
      )}
    >
      <TopNav
        isAssistantOpen={isAssistantOpen}
        onToggleAssistant={() => setIsAssistantOpen((current) => !current)}
      />
      <main className="relative flex min-h-0 flex-1 overflow-hidden p-2">
        <section className={cn('min-w-0 flex-1 overflow-hidden', isAssistantOpen && 'lg:pr-2')}>
          {children}
        </section>
        {isAssistantOpen && <AIAssistantPane />}
      </main>
      <AppFooter />
    </div>
  );
}
