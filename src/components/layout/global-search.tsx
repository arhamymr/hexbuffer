'use client';

import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useHistoryQueryStore } from '@/pages/live-traffic/state/history-query-store';
import { useBrowserAutomationStore } from '@/stores/browser-automation';
import { useInvokerStore } from '@/stores/invoker';
import { useNavStore } from '@/stores/nav';
import { setBrowserSearch } from '@/triggers';

// ---------------------------------------------------------------------------
// GlobalSearch Component
// ---------------------------------------------------------------------------

export function GlobalSearch() {
  const { pathname } = useLocation();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Pages where global search should be hidden
  const hiddenPaths = [
    '/intercept', '/repeater',
    '/automation', '/regression',
    '/playground', '/threats', '/debugger', '/tools', '/documents',
  ];
  const isHidden = hiddenPaths.some((p) => pathname.startsWith(p));

  const isOverview = pathname === '/';
  const isLiveTraffic = pathname === '/live-traffic';
  const isBrowserAutomation = pathname.startsWith('/browser-automation');
  const isInvoker = pathname.startsWith('/invoker');

  // Overview Search: read/write the nav store
  const overviewSearch = useNavStore((s) => s.overviewSearchQuery);
  const setOverviewSearch = useNavStore((s) => s.setOverviewSearchQuery);

  // Live Traffic: read/write the filter store directly
  const liveSearch = useHistoryQueryStore((s) => s.filter.search);
  const liveSetSearch = useHistoryQueryStore((s) => s.setSearch);

  // Browser Automation: read via store, write via trigger
  const browserSearch = useBrowserAutomationStore((s) => s.getActiveTab()?.search ?? '');

  // Invoker: read/write the active tab's filterSearch
  const invokerSearch = useInvokerStore((s) => s.tabs.find((t) => t.id === s.activeTabId)?.filterSearch ?? '');
  const invokerSetSearch = useInvokerStore((s) => s.setFilterSearch);

  // For non-routed pages, maintain local state
  const [query, setQuery] = React.useState('');

  const placeholder = isOverview
    ? 'Search features…'
    : isLiveTraffic
      ? 'Search URL, host, method, body…'
      : isBrowserAutomation
        ? 'Search pages, logs, insights…'
        : isInvoker
          ? 'Search status or payload…'
          : 'Search pages…';

  const value = isOverview
    ? overviewSearch
    : isLiveTraffic
      ? liveSearch
      : isBrowserAutomation
        ? browserSearch
        : isInvoker
          ? invokerSearch
          : query;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    if (isOverview) {
      setOverviewSearch(next);
    } else if (isLiveTraffic) {
      liveSetSearch(next);
    } else if (isBrowserAutomation) {
      setBrowserSearch(next);
    } else if (isInvoker) {
      invokerSetSearch(next);
    } else {
      setQuery(next);
    }
  };

  // Global "/" keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isHidden) return null;

  return (
    <div className="relative flex items-center mx-2">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          'h-7 w-44 rounded-md border border-input bg-transparent pl-7 pr-2',
          'text-xs text-foreground placeholder:text-muted-foreground',
          'outline-none transition-all duration-200',
          'focus:w-64 focus:border-primary/50 focus:ring-1 focus:ring-primary/30',
        )}
      />
    </div>
  );
}
