'use client';

import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Crosshair, Settings, Moon, Sun, ArrowUpDown, RefreshCw, Wrench, Bot, FileText, MessageSquare } from 'lucide-react';
import { useTheme } from './theme-provider';
import { Button } from './ui/button';
import { AppFooter } from './footer';
import { DashboardComposer } from '@/pages/ai-chat/components/composer';
import { DashboardThread } from '@/pages/ai-chat/components/thread';
import { useDashboardPage } from '@/pages/ai-chat/hooks/use-dashboard-page';
import { cn } from '@/lib/utils';

const mainNavItems = [
  { label: 'HTTP History', icon: ArrowUpDown, href: '/history' },
  { label: 'Brute Force', icon: Crosshair, href: '/brute-force' },
  { label: 'Repeater', icon: RefreshCw, href: '/repeater' },
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
  const navRef = React.useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

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
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex items-center justify-between h-8.5 px-4">
        <div className='flex min-w-0 flex-1 items-center align-center gap-4'>
          <div className="flex items-center gap-1">
            {/* Light mode */}
            <img
              src="https://assets.apsaradigital.com/logo.png"
              className="h-3 w-18 shrink-0 dark:hidden"
              alt="Logo"
            />

            {/* Dark mode */}
            <img
              src="https://assets.apsaradigital.com/logo-white.png"
              className="hidden h-3 w-18 shrink-0 dark:block"
              alt="Logo"
            />
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

  return (
    <div className="h-screen flex flex-col">
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
